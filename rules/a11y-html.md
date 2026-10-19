# Accessibility and semantic HTML

Field meanings are in `SKILL.md`. Text under "Judge" is for the Claude layer only. jsx-a11y only reads JSX, so in `.html` files every rule here is Claude's.

## R16 Use semantic elements, not div with onClick
- layer: consensus
- severity: must
- checker: both
- lint: jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
- why: `button`, `a`, `nav` and lists come with focus, keyboard handling and screen-reader roles; a clickable `div` has none of them.
- added: 2026-10-13

Judge: in `.html`, flag `div` or `span` with `onclick`. Lint covers JSX.

## R17 Form controls have labels; images have alt text
- layer: consensus
- severity: must
- checker: both
- lint: jsx-a11y/label-has-associated-control, jsx-a11y/alt-text
- why: Without them screen readers announce an unnamed field or a file name. Decorative images use `alt=""`.
- added: 2026-10-13

Judge: jsx-a11y never flags a label whose child is an `{expression}` because it assumes the expression may hold a control. Check those: a `<label>{text}</label>` needs `htmlFor` or a nested control. Also check `.html`.

## R18 Interactive elements work from the keyboard; removed outlines are replaced
- layer: consensus
- severity: must
- checker: both
- lint: jsx-a11y/interactive-supports-focus
- why: Keyboard and switch users can only reach what takes focus, and only see where they are if focus is visible.
- added: 2026-10-13

Judge: lint covers JSX attributes. Claude checks CSS that sets `outline: none` or `0` without a `:focus-visible` replacement, mouse-only behaviour attached with `addEventListener` (`mouseenter`, `mouseover`, `click` on non-interactive elements) with no focus or keyboard equivalent, and `.html`.

## R28 Animations respect prefers-reduced-motion
- layer: consensus
- severity: suggest
- checker: claude
- why: Motion can trigger nausea or vestibular symptoms; WCAG 2.3.3 asks for a way to turn non-essential animation off.
- added: 2026-10-18

Judge: flag CSS `animation` or long `transition`, and JS animation loops (`requestAnimationFrame`, GSAP, WebGL), with no `@media (prefers-reduced-motion: reduce)` or `matchMedia('(prefers-reduced-motion: reduce)')` path. Slowing an animation down is an acceptable reduced-motion path for a spinner.

## R29 aria-live regions are not updated at high frequency
- layer: consensus
- severity: should
- checker: claude
- why: Screen readers announce every change to a live region, so per-letter typing or millisecond counters become a constant stream of speech.
- added: 2026-10-18

Judge: flag `aria-live` or `role="status"`/`"alert"` elements whose content changes on a timer or animation frame. Suggest updating the live text only when it settles, or keeping the animated text outside the live region.
