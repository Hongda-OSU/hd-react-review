const rows = Array.from({ length: 10000 }, (_, n) => ({ id: `row-${n}`, text: `Event ${n}` }));

export const AuditLog = () => (
  <ol>
    {/* expect-claude: R15 */}
    {rows.map((row) => (
      <li key={row.id}>{row.text}</li>
    ))}
  </ol>
);
