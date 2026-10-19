import { useId, useState } from "react";

import { Button } from "@/components/atoms/Button";

type Props = { onSearch: (query: string) => void };

export const SearchField = ({ onSearch }: Props) => {
  const id = useId();
  const [query, setQuery] = useState("");

  return (
    <div>
      <label htmlFor={id}>Search</label>
      <input id={id} value={query} onChange={(event) => setQuery(event.target.value)} />
      <Button label="Go" onPress={() => onSearch(query.trim())} />
    </div>
  );
};
