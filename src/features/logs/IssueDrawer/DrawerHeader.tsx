// src/features/logs/components/IssueDrawer/DrawerHeader.tsx

import { Ico, IconClose, iconSize } from "../../../components/icons";
import { LEVEL_STYLES } from "../constants";
import { SentryIssue } from "../types";



interface Props {
  issue: SentryIssue;
  onClose: () => void;
}

export function DrawerHeader({ issue, onClose }: Props) {
  const lvl = LEVEL_STYLES[issue.level] ?? LEVEL_STYLES.error;

  return (
    <div className="flex items-start gap-3 p-5 border-b border-[#30363d]">
      <span className={`mt-1 px-2 py-0.5 rounded text-xs font-semibold uppercase ${lvl.bg} ${lvl.text}`}>
        {issue.level}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm leading-snug break-words">{issue.title}</p>
        {issue.culprit && (
          <p className="text-[#8b949e] text-xs mt-1 font-mono truncate">{issue.culprit}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-[#6e7681] hover:text-white transition-colors ml-2 shrink-0"
      >
        <Ico icon={IconClose} size={iconSize.xl} />
      </button>
    </div>
  );
}