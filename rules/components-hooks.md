# Components and hooks

Field meanings are in `SKILL.md`. Text under "Judge" is for the Claude layer only.

## R03 Custom hooks are named useXxx
- layer: consensus
- severity: must
- checker: claude
- why: React only applies the Rules of Hooks to functions whose name starts with `use`; a hook with another name hides hook calls from readers and from lint.
- added: 2026-10-13

Judge: a function (not a component) that calls a hook must be named `useSomething`. Report R03 on its declaration line; lint reports each hook call inside it as R23 separately. A `use` function that calls no hooks should drop the prefix.

## R04 Split components with too many props or stacked boolean props
- layer: consensus
- severity: suggest
- checker: claude
- why: Each boolean prop doubles the states a component can be in; stacked flags usually mean one component is doing the job of several.
- added: 2026-10-13

Judge: flag three or more boolean props that pick visual variants (`isDark`, `isCompact`, `isRounded`), or more than about seven props serving unrelated concerns. Suggest one `variant` prop or composition. Do not flag props that are fields of one data object.

## R05 Follow standard atomic design; dependencies only point down
- layer: project
- severity: should
- checker: both
- lint: boundaries/dependencies
- why: The five layers (atoms, molecules, organisms, templates, pages under `src/components/`) only stay meaningful if lower layers never import higher ones. Same-layer imports and files outside the layers are allowed.
- requires: atomic-design
- added: 2026-10-13

Judge: lint checks import direction. Claude checks placement, and only flags clear cases: an "atom" with app data fetching or several child components, or an "organism" that is a single styled element.

## R06 PascalCase for components and their files; camelCase for hooks and utilities
- layer: consensus
- severity: must
- checker: both
- lint: react/jsx-pascal-case
- why: JSX treats lowercase names as HTML tags, and matching file names make components findable.
- added: 2026-10-13

Judge: lint only sees component names used in JSX. Claude checks declarations and file names: a file whose main export is a component is `IconButton.tsx`, hooks and utilities are `useOnline.ts` and `formatDate.ts`. `index.tsx` inside a PascalCase folder is fine.

## R10 useEffect only synchronises with external systems
- layer: consensus
- severity: should
- checker: both
- lint: react-hooks/set-state-in-effect
- why: Effects that compute values or react to events cause extra renders and stale-state bugs; see react.dev "You Might Not Need an Effect".
- added: 2026-10-13

Judge: flag effects that derive a value from props or state, reset state when a prop changes (use a `key` or compute during render), or run logic that belongs in an event handler. Fetching, subscriptions, timers and DOM or third-party APIs are legitimate.

## R11 List keys are stable ids, not array indexes
- layer: consensus
- severity: must
- checker: lint
- lint: react/no-array-index-key
- why: Index keys attach state and DOM to the wrong item when the list is reordered, filtered or prepended.
- added: 2026-10-13

## R12 Derived values are not stored in state; state lives in the closest common parent
- layer: consensus
- severity: should
- checker: claude
- why: Copied state drifts from its source, and state placed too high or too low forces prop drilling or duplication.
- added: 2026-10-13

Judge: flag `useState` initialised from props or other state and then kept in sync, and state duplicated between siblings. Suggest computing during render or lifting the state.

## R13 Components are not defined inside other components
- layer: consensus
- severity: must
- checker: lint
- lint: react/no-unstable-nested-components
- why: A component defined during render is a new type every render, so React remounts it and loses its state.
- added: 2026-10-13

## R23 Hooks are only called at the top level of components and custom hooks
- layer: consensus
- severity: must
- checker: lint
- lint: react-hooks/rules-of-hooks
- why: React matches hook state by call order; a hook inside a condition, loop or nested function breaks that order.
- added: 2026-10-18

## R24 Effect, useMemo and useCallback dependency arrays are complete
- layer: consensus
- severity: should
- checker: lint
- lint: react-hooks/exhaustive-deps
- why: A missing dependency makes the callback read stale values.
- added: 2026-10-18

## R26 Objects and arrays in effect dependencies keep a stable reference
- layer: consensus
- severity: should
- checker: claude
- why: An object or array created during render is new every time, so an effect that depends on it re-runs on every render, often tearing down expensive work. exhaustive-deps only checks that dependencies are listed, not that they are stable.
- added: 2026-10-18

Judge: follow each object or array dependency to where it is created: inline in the parent's render, a default parameter value (`size = { width: 640 }`), or a literal in the component body. Suggest a module-level constant, primitive props, or `useMemo` at the source. `useMemo` here does not conflict with R14.

## R27 Async callbacks in effects do nothing after cleanup
- layer: consensus
- severity: should
- checker: claude
- why: A promise, timer or library callback that resolves after unmount or a dependency change updates state or DOM that no longer belongs to it, and listeners it registers leak.
- added: 2026-10-18

Judge: flag effects that start async work (`fetch(...).then`, `await`, `setTimeout`, a library's `ready` or `load` event) without a cancelled flag, `AbortController` or equivalent, and cleanups that cannot reach resources registered in the async phase.
