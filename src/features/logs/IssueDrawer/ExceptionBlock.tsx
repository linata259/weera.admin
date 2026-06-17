// src/features/logs/components/IssueDrawer/ExceptionBlock.tsx

import { SentryException } from "../types";



interface Props {
  exceptions: SentryException[];
}

export function ExceptionBlock({ exceptions }: Props) {
  if (exceptions.length === 0) return null;

  return (
    <>
      {exceptions.map((exc, i) => (
        <div key={i}>
          <h3 className="text-[#8b949e] text-xs uppercase tracking-widest mb-2">
            Exception{exceptions.length > 1 ? ` ${i + 1}` : ""}
          </h3>
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <p className="text-orange-300 text-sm font-semibold">{exc.type}</p>
            <p className="text-[#c9d1d9] text-sm mt-1">{exc.value}</p>

            {exc.stacktrace?.frames && (
              <div className="mt-4">
                <p className="text-[#8b949e] text-xs uppercase tracking-widest mb-2">Stack Trace</p>
                <div className="space-y-1">
                  {[...exc.stacktrace.frames].reverse().map((frame, fi) => (
                    <div
                      key={fi}
                      className={`text-xs font-mono px-3 py-2 rounded ${
                        frame.inApp
                          ? "bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]"
                          : "text-[#484f58]"
                      }`}
                    >
                      <span className={frame.inApp ? "text-[#6c5ce7]" : ""}>{frame.function}</span>
                      <span className="text-[#6e7681] ml-2">{frame.filename}:{frame.lineNo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}