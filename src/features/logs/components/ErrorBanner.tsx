// src/features/logs/components/ErrorBanner.tsx

import { Ico, IconError, iconSize } from "../../../components/icons";

interface Props {
  message: string;
}

export function ErrorBanner({ message }: Props) {
  return (
    <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
      <span className="text-red-400 shrink-0 mt-0.5 inline-flex">
        <Ico icon={IconError} size={iconSize.lg} />
      </span>
      <div>
        <p className="text-red-300 text-sm font-medium">Failed to fetch issues</p>
        <p className="text-red-400 text-xs mt-1">{message}</p>
        {message.includes("403") && (
          <p className="text-red-500 text-xs mt-1">
            Make sure your token has{" "}
            <code className="bg-red-900 px-1 rounded">project:read</code> scope.
          </p>
        )}
      </div>
    </div>
  );
}