import { useState } from "react";

// expect-lint: R01
export function TextField({ label, hint }: { label: string; hint?: string }) {
  const [value, setValue] = useState("");
  if (hint) {
    // expect-lint: R23
    const [shown] = useState(true);
  }

  return (
    <div>
      {/* jsx-a11y assumes any {expression} child may hold a control, so only Claude sees this */}
      {/* expect-claude: R17 */}
      <label>{label}</label>
      <input value={value} onChange={(event) => setValue(event.target.value)} />
      {/* expect-lint: R17 */}
      <label>Notes</label>
      <textarea />
      {/* expect-lint: R17 */}
      <img src="/icons/info.svg" />
    </div>
  );
}
