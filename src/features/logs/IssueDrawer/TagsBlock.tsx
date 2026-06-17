// src/features/logs/components/IssueDrawer/TagsBlock.tsx

interface Props {
  tags: { key: string; value: string }[];
}

export function TagsBlock({ tags }: Props) {
  if (!tags || tags.length === 0) return null;

  return (
    <div>
      <h3 className="text-[#8b949e] text-xs uppercase tracking-widest mb-2">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t.key}
            className="bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs font-mono"
          >
            <span className="text-[#8b949e]">{t.key}:</span>{" "}
            <span className="text-[#c9d1d9]">{t.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}