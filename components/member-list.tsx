import { Search, Tag } from "lucide-react";

const placeholderMembers = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  name: "メンバー氏名",
}));

export function MemberList() {
  return (
    <div className="flex w-full flex-col gap-3">
      {/* 検索 + タグ */}
      <div className="flex items-center gap-2">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-full border border-[var(--flamingo-soft)] bg-white px-4 text-sm text-[var(--muted-foreground)]">
          <Search className="h-4 w-4 text-[var(--flamingo-soft)]" />
          <input
            type="search"
            placeholder="メンバーを検索"
            className="w-full bg-transparent outline-none placeholder:text-[var(--muted-foreground)]/80"
          />
        </label>
        <button
          type="button"
          aria-label="タグで絞り込み"
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--flamingo-soft)] bg-white text-[var(--flamingo)] transition-colors hover:bg-[var(--flamingo-tint)]"
        >
          <Tag className="h-4 w-4" />
        </button>
      </div>

      {/* 全選択 */}
      <div>
        <span className="inline-flex items-center rounded-full bg-[var(--flamingo)] px-3 py-1 text-xs font-medium text-white">
          全選択
        </span>
      </div>

      {/* メンバーリスト */}
      <ul className="flex flex-col gap-3">
        {placeholderMembers.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              aria-label={m.name}
              className="h-5 w-5 shrink-0 rounded-md border-2 border-[var(--flamingo-soft)] accent-[var(--flamingo)]"
            />
            <span className="text-sm text-[var(--foreground)]/80">{m.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
