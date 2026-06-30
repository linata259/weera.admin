// src/features/logs/components/ErrorBanner.tsx

interface Props {
  message: string;
}

export function ErrorBanner({ message }: Props) {
  return (
    <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
      <svg
        className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
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