// A project's own disable comment for a plugin rr does not load. ESLint reports
// "Definition for rule ... was not found"; it has no rule id, so it must not reach the report.
// eslint-disable-next-line import/no-cycle
export const SiteHeader = () => <header>Fixture</header>;
