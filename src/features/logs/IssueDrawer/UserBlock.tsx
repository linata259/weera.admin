// src/features/logs/components/IssueDrawer/UserBlock.tsx

import { SentryEvent } from "../types";



interface Props {
  user: SentryEvent["user"];
}

export function UserBlock({ user }: Props) {
  if (!user) return null;

  return (
    <div>
      <h3 className="text-[#8b949e] text-xs uppercase tracking-widest mb-2">Affected User</h3>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 text-sm space-y-1">
        {user.email    && <p className="text-[#c9d1d9]">📧 {user.email}</p>}
        {user.id       && <p className="text-[#8b949e] text-xs">ID: {user.id}</p>}
        {user.username && <p className="text-[#8b949e] text-xs">Username: {user.username}</p>}
      </div>
    </div>
  );
}