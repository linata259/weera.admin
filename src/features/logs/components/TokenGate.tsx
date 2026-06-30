// src/features/logs/components/TokenGate.tsx

import { useState } from "react";

interface Props {
  onToken: (token: string) => void;
}

export function TokenGate({ onToken }: Props) {
  const [draft, setDraft] = useState("");

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 w-full max-w-md shadow-2xl">

        {/* Logo + title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#6c5ce7] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">Sentry Logs</h1>
            <p className="text-[#8b949e] text-sm">Weera App Monitoring</p>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-[#8b949e] text-sm mb-1">Sentry Auth Token</p>
        <p className="text-[#6e7681] text-xs mb-4">
          Generate one at{" "}
          <a
            href="https://sentry.io/settings/account/api/auth-tokens/"
            target="_blank"
            rel="noreferrer"
            className="text-[#6c5ce7] hover:underline"
          >
            sentry.io → Settings → Auth Tokens
          </a>
          . Needs{" "}
          <code className="bg-[#0d1117] px-1 rounded text-[11px]">project:read</code> scope.
        </p>

        {/* Input */}
        <input
          type="password"
          placeholder="sntrys_..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && draft.trim() && onToken(draft.trim())}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white text-sm font-mono placeholder-[#484f58] focus:outline-none focus:border-[#6c5ce7] mb-4"
          autoFocus
        />

        <button
          onClick={() => draft.trim() && onToken(draft.trim())}
          disabled={!draft.trim()}
          className="w-full bg-[#6c5ce7] hover:bg-[#5b4fcf] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
        >
          Connect to Sentry
        </button>

        <p className="text-[#6e7681] text-xs mt-4 text-center">
          Token is stored in memory only and never persisted.
        </p>
      </div>
    </div>
  );
}