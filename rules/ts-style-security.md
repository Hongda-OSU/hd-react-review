# TypeScript, style and security

Field meanings are in `SKILL.md`. Text under "Judge" is for the Claude layer only.

## R01 Components and functions use const arrow functions
- layer: personal
- severity: suggest
- checker: lint
- lint: func-style, react/function-component-definition
- why: Personal preference for one consistent style. React's own docs use function declarations, so this is not consensus.
- exceptions: generators (`function*`) must be declarations; TS overloads need declarations (func-style already skips them); hoisting that the code relies on
- added: 2026-10-13

Judge: lint flags generators too. Drop an R01 lint finding when its line is an exception.

## R02 Formatting follows rr's Prettier config
- layer: personal
- severity: suggest
- checker: lint
- lint: prettier/prettier
- why: Parameters stay on one line until they pass `printWidth` (100); everything else uses Prettier defaults.
- exceptions: projects with their own Prettier config (bin/lint.mjs turns the rule off)
- added: 2026-10-13

Judge: report all R02 findings in a file as one item that lists the lines; they are formatting, not individual problems.

## R07 CSS class names are kebab-case, without underscores
- layer: personal
- severity: suggest
- checker: lint
- lint: selector-class-pattern
- why: Personal preference. Applies to plain CSS and CSS Modules, where classes are read as `styles['card-title']`.
- added: 2026-10-13

## R08 Register @property in the component's CSS Modules file, with a component prefix
- layer: project
- severity: should
- checker: claude
- why: `@property` is global even inside a CSS Module, so an unprefixed `--angle` in one component silently changes another. StyleX components use `stylex.types` with `defineVars` instead of a separate CSS Modules file.
- requires: css-modules
- added: 2026-10-13

Judge: flag `@property` in plain or global CSS, a registered name without the component's prefix (`--angle` instead of `--profile-card-angle`), and a StyleX component that adds a CSS Modules file just for `@property`.

## R09 Complex React components use StyleX
- layer: project
- severity: should
- checker: both
- lint: @stylexjs/valid-styles
- why: StyleX gives typed, collision-free styles with variants, which plain CSS handles poorly once a component has several states.
- requires: stylex
- added: 2026-10-13

Judge: complex means styles that change with props or state, several variants, or dynamic values. A small static component may stay on CSS Modules. Lint only checks StyleX syntax.

## R19 No `any`; use `unknown` and narrow
- layer: consensus
- severity: should
- checker: lint
- lint: @typescript-eslint/no-explicit-any
- why: `any` switches type checking off for everything it touches.
- requires: typescript
- added: 2026-10-13

## R20 No dangerouslySetInnerHTML; sanitise when it is unavoidable
- layer: consensus
- severity: must
- checker: both
- lint: react/no-danger
- why: Unsanitised HTML from props, APIs or user input is an XSS hole.
- exceptions: the HTML is sanitised right before use (for example `DOMPurify.sanitize`), or is a constant written in the source
- added: 2026-10-13

Judge: follow the value to its source. Drop the lint finding when an exception applies; otherwise keep it and say where the unsanitised value comes from.

## R21 No secrets or tokens in frontend code or public env variables
- layer: consensus
- severity: must
- checker: claude
- why: Everything in a frontend bundle, including `VITE_*`, `NEXT_PUBLIC_*` and `REACT_APP_*` variables, ships to every visitor.
- added: 2026-10-13

Judge: flag string literals named or shaped like keys, tokens or passwords, and public env variables whose names say SECRET, TOKEN, PASSWORD or PRIVATE. Keys designed to be public (Stripe publishable keys, Supabase anon keys) are fine. Never repeat a real-looking secret value in the report; name the variable and line only.

## R22 One styling approach per component
- layer: project
- severity: should
- checker: claude
- why: Mixing plain CSS, CSS Modules and StyleX in one component creates specificity fights and hides where a style comes from.
- added: 2026-10-13

Judge: look at the component together with the style files it imports. Flag a component that uses more than one of plain CSS classes, CSS Modules and StyleX.

## R25 Type checking passes
- layer: consensus
- severity: must
- checker: lint
- lint: tsc
- why: Type errors are bugs the compiler already found.
- requires: typescript
- added: 2026-10-18
