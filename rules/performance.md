# Performance

Field meanings are in `SKILL.md`. Text under "Judge" is for the Claude layer only.

## R14 No memo, useMemo or useCallback without a measured or obvious re-render problem
- layer: consensus
- severity: suggest
- checker: claude
- why: Memoisation costs memory and readability, and is only worth it when it prevents real work. React Compiler memoises automatically.
- added: 2026-10-13

Judge: flag `useMemo` around cheap expressions (`items.length`, string formatting), and `useCallback` or `memo` with no memoised consumer. Do not flag memoisation that keeps an effect dependency stable (R26) or wraps visibly expensive work. When the project has `react-compiler`, every hand-written memo is redundant.

## R15 Virtualise long lists; lazy-load heavy components and routes
- layer: consensus
- severity: suggest
- checker: claude
- why: Rendering thousands of rows, or shipping every route in the first bundle, slows the first paint more than any micro-optimisation.
- added: 2026-10-13

Judge: flag lists that can reach a few hundred items or more rendered without windowing, and heavy components or route pages imported eagerly where `React.lazy` would split them. Do not flag short or fixed lists.
