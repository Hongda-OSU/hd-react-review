import { useState } from "react";

import { Avatar } from "@/components/atoms/Avatar";
import { SearchField } from "@/components/molecules/SearchField";
import { StatusBadge } from "@/components/molecules/StatusBadge";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type User = { id: string; name: string; avatarUrl: string };

export const UserList = ({ users }: { users: User[] }) => {
  const [query, setQuery] = useState("");
  const online = useOnlineStatus();
  const needle = query.toLowerCase();
  const visible = users.filter((user) => user.name.toLowerCase().includes(needle));

  return (
    <section aria-label="Users">
      <StatusBadge label={online ? "Online" : "Offline"} success={online} />
      <SearchField onSearch={setQuery} />
      <ul>
        {visible.map((user) => (
          <li key={user.id}>
            <Avatar src={user.avatarUrl} name={user.name} />
            {user.name}
          </li>
        ))}
      </ul>
    </section>
  );
};
