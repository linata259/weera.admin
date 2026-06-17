// src/features/logs/components/IssueDrawer/EnvironmentBlock.tsx

import { SentryEvent } from "../types";



interface Props {
  event: SentryEvent;
}

export function EnvironmentBlock({ event }: Props) {
  const hasData = event.sdk || event.contexts?.os || event.contexts?.device;
  if (!hasData) return null;

  return (
    <div>
      <h3 className="text-[#8b949e] text-xs uppercase tracking-widest mb-2">Environment</h3>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 text-xs font-mono space-y-1">
        {event.sdk && (
          <p className="text-[#c9d1d9]">
            SDK: {event.sdk.name} {event.sdk.version}
          </p>
        )}
        {event.contexts?.os && (
          <p className="text-[#8b949e]">
            OS: {event.contexts.os["name"]} {event.contexts.os["version"]}
          </p>
        )}
        {event.contexts?.device && (
          <p className="text-[#8b949e]">
            Device: {event.contexts.device["model"] ?? event.contexts.device["name"]}
          </p>
        )}
      </div>
    </div>
  );
}