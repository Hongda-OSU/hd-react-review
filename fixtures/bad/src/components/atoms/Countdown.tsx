import { useEffect, useState } from "react";

export const Countdown = () => {
  const [ms, setMs] = useState(10000);

  useEffect(() => {
    const id = setInterval(() => setMs((left: number) => Math.max(0, left - 50)), 50);
    return () => clearInterval(id);
  }, []);

  // expect-claude: R29
  return <p aria-live="polite">{(ms / 1000).toFixed(2)}s</p>;
};
