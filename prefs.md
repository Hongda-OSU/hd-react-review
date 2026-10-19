# Preference log

Read before every review. One row per veto, downgrade or rewrite the user asked for; for the same rule and scope the newest row wins.

- scope: `global`, or the reviewed project's `package.json` name. Never an absolute path: this repo is public.
- action: `veto` drops the rule, `downgrade` lowers its severity one step, `modify` changes how it is judged as described in the reason.

| date | scope | ruleId | action | reason |
| --- | --- | --- | --- | --- |
