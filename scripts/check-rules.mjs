// Check that the rule files are well formed and agree with the lint configs and fixtures.
// The rule files are the source of truth; lint/ and fixtures/ must not drift from them.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { TSC_RULE, ruleIdsFrom } from '../bin/lint.mjs';

const RR = path.resolve(import.meta.dirname, '..');

const ENUMS = {
  layer: ['consensus', 'project', 'personal'],
  severity: ['must', 'should', 'suggest'],
  checker: ['lint', 'claude', 'both'],
};
// Keys of the `project` object printed by bin/lint.mjs.
const DETECTED = ['typescript', 'stylex', 'css-modules', 'react-compiler', 'atomic-design'];
const REQUIRED = ['layer', 'severity', 'checker', 'why', 'added'];

const problems = [];
const rules = new Map();

for (const name of readdirSync(path.join(RR, 'rules'))) {
  let current = null;
  for (const line of readFileSync(path.join(RR, 'rules', name), 'utf8').split('\n')) {
    const heading = line.match(/^## (R\d{2}) (.+)$/);
    if (heading) {
      if (rules.has(heading[1])) problems.push(`${heading[1]} is defined twice`);
      current = { id: heading[1], file: name, fields: {} };
      rules.set(current.id, current);
      continue;
    }
    const field = line.match(/^- (\w+): (.+)$/);
    if (field && current) current.fields[field[1]] = field[2];
  }
}

const list = (value) => (value ? value.split(',').map((item) => item.trim()) : []);

for (const { id, fields } of rules.values()) {
  for (const key of REQUIRED) if (!fields[key]) problems.push(`${id}: missing ${key}`);
  for (const [key, allowed] of Object.entries(ENUMS)) {
    if (fields[key] && !allowed.includes(fields[key])) {
      problems.push(`${id}: ${key} "${fields[key]}" is not one of ${allowed.join(', ')}`);
    }
  }
  if (fields.added && !/^\d{4}-\d{2}-\d{2}$/.test(fields.added)) {
    problems.push(`${id}: added must be YYYY-MM-DD`);
  }
  for (const flag of list(fields.requires)) {
    if (!DETECTED.includes(flag)) problems.push(`${id}: requires "${flag}" is never detected`);
  }
  if (fields.layer === 'personal' && fields.severity !== 'suggest') {
    problems.push(`${id}: personal rules are always suggest`);
  }
  if (fields.layer === 'project' && fields.severity !== 'should') {
    problems.push(`${id}: project rules are always should`);
  }
  const usesLint = fields.checker === 'lint' || fields.checker === 'both';
  if (usesLint && !fields.lint)
    problems.push(`${id}: checker ${fields.checker} needs a lint field`);
  if (!usesLint && fields.lint) problems.push(`${id}: checker claude must not list lint rules`);
}

// Every `// Rxx` mapping in lint/ must match a rule that lists that lint rule, and back.
const mapped = {
  ...ruleIdsFrom(path.join(RR, 'lint/eslint.config.mjs')),
  ...ruleIdsFrom(path.join(RR, 'lint/stylelint.config.mjs')),
  tsc: TSC_RULE,
};
for (const [tool, id] of Object.entries(mapped)) {
  const rule = rules.get(id);
  if (!rule) problems.push(`lint maps ${tool} to ${id}, which no rule file defines`);
  else if (!list(rule.fields.lint).includes(tool)) problems.push(`${id}: lint field lacks ${tool}`);
}
for (const { id, fields } of rules.values()) {
  for (const tool of list(fields.lint)) {
    if (mapped[tool] !== id)
      problems.push(`${id}: lists ${tool}, but lint/ maps it to ${mapped[tool] ?? 'nothing'}`);
  }
}

// Fixture annotations must name real rules, checked by the layer they claim.
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
const LAYERS = {
  lint: ['lint', 'both'],
  claude: ['claude', 'both'],
  none: ['lint', 'claude', 'both'],
};
for (const file of walk(path.join(RR, 'fixtures'))) {
  for (const hit of readFileSync(file, 'utf8').matchAll(
    /expect-(lint|claude|none):\s*([R\d, ]+)/g,
  )) {
    for (const id of list(hit[2])) {
      const rule = rules.get(id);
      const where = path.relative(RR, file);
      if (!rule) problems.push(`${where}: expect-${hit[1]} names unknown ${id}`);
      else if (!LAYERS[hit[1]].includes(rule.fields.checker)) {
        problems.push(
          `${where}: expect-${hit[1]} ${id}, but its checker is ${rule.fields.checker}`,
        );
      }
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`rules ok: ${rules.size} rules agree with lint/ and fixtures/`);
