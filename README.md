# hd-react-review (rr)

A local code reviewer for React, HTML and CSS: lint catches what can be checked mechanically, Claude judges the rest, and every finding says how severe it is and whether it is industry consensus, a project convention or just personal preference.

## Features

- 29 rules in three layers (consensus, project, personal), each finding tagged with severity, layer and rule id; the personal layer can be switched off per review
- Deterministic first: ESLint, stylelint, Prettier and `tsc` run before Claude, and Claude only reviews what they cannot, such as effect misuse, state placement, keyboard access and leaked secrets
- Nothing to install in the reviewed project, and nothing written to it; rr brings its own toolchain
- Review a file, a directory, or only your uncommitted changes
- Rules are Markdown; `pnpm test` fails if rules, lint config and test fixtures drift apart

## Tech Stack

- Claude Code skill: `SKILL.md` plus the rule files in `rules/`
- Node.js (ESM) lint runner in `bin/lint.mjs`
- ESLint 9 with typescript-eslint, react, react-hooks, jsx-a11y, boundaries and StyleX plugins; Prettier 3; stylelint 17; TypeScript 6

## Getting Started

### Prerequisites

- Node.js 20.19+
- pnpm 12+
- Claude Code

### Installation

```bash
git clone https://github.com/Hongda-OSU/hd-react-review.git
cd hd-react-review
pnpm install
mkdir -p ~/.claude/skills
ln -s "$PWD" ~/.claude/skills/react-review
```

## Usage

In Claude Code, from any project, ask for a review:

```text
review src/components
review my uncommitted changes
review src/components, skip personal preferences
```

The report is written in Chinese: a summary table, then each finding with its line, reason and a concrete fix.

To see only the lint layer, run it directly; it prints JSON:

```bash
node bin/lint.mjs path/to/project/src
node bin/lint.mjs --changed path/to/project
```

To change how rr reviews, edit `rules/*.md`, or record a veto or downgrade in `prefs.md`. Then run:

```bash
pnpm test
```
