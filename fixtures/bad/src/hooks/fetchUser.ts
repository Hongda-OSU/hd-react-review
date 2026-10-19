import { useEffect, useState } from "react";

// expect-claude: R03
export const fetchUser = (id: string) => {
  // expect-lint: R23
  const [user] = useState(null);
  // expect-lint: R23
  useEffect(() => {
    document.title = id;
  }, [id]);
  return user;
};
