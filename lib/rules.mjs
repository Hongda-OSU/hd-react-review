// Readers for rules/*.md and prefs.md, shared by bin/rr.mjs and scripts/check-rules.mjs.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const RR = path.resolve(import.meta.dirname, '..');

export const SEVERITIES = ['must', 'should', 'suggest'];
export const SEVERITY_LABEL = { must: '必改', should: '应改', suggest: '建议' };
export const LAYER_LABEL = { consensus: '业界共识', project: '项目约定', personal: '个人偏好' };

export const list = (value) => (value ? value.split(',').map((item) => item.trim()) : []);

// Every "## Rxx Title" heading with its "- key: value" fields, in file order.
export const readRules = () => {
  const rules = [];
  for (const file of readdirSync(path.join(RR, 'rules')).sort()) {
    let current = null;
    for (const line of readFileSync(path.join(RR, 'rules', file), 'utf8').split('\n')) {
      const heading = line.match(/^## (R\d{2}) (.+)$/);
      if (heading) {
        current = { id: heading[1], title: heading[2], file, fields: {} };
        rules.push(current);
        continue;
      }
      const field = line.match(/^- (\w+): (.+)$/);
      if (field && current) current.fields[field[1]] = field[2];
    }
  }
  return rules;
};

// Rows of the prefs.md table, oldest first.
export const readPrefs = () => {
  const rows = [];
  for (const line of readFileSync(path.join(RR, 'prefs.md'), 'utf8').split('\n')) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 5 || !/^\d{4}-\d{2}-\d{2}$/.test(cells[0])) continue;
    const [date, scope, ruleId, action, reason] = cells;
    rows.push({ date, scope, ruleId, action, reason });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
};

// Apply veto and downgrade rows for this project; "modify" is left to the Claude layer.
// For the same rule and scope the newest row wins.
export const applyPrefs = (findings, prefs, projectName) => {
  const latest = new Map();
  for (const row of prefs) {
    if (row.scope === 'global' || row.scope === projectName) {
      latest.set(`${row.scope}:${row.ruleId}`, row);
    }
  }
  const actions = new Map();
  for (const row of latest.values()) {
    if (row.action === 'veto' || row.action === 'downgrade') {
      actions.set(row.ruleId, [...(actions.get(row.ruleId) ?? []), row.action]);
    }
  }
  return findings.flatMap((finding) => {
    const applied = actions.get(finding.ruleId) ?? [];
    if (applied.includes('veto')) return [];
    let { severity } = finding;
    for (const action of applied) {
      if (action === 'downgrade') {
        severity = SEVERITIES[Math.min(SEVERITIES.indexOf(severity) + 1, 2)];
      }
    }
    return [{ ...finding, severity }];
  });
};
