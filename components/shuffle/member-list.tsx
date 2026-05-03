"use client";

/**
 * メンバー一覧 + 検索 + 全選択
 * --------------------------------------------------------------------
 * - "コントロールド" コンポーネント: 状態は親 (page.tsx) が持ち、
 *   このコンポーネントは表示と onChange のディスパッチのみ。
 * - こうしておくと、ロジックを画面から API/サーバーに差し替えるときに
 *   このファイルを触らなくて済む。
 */

import { Search, Tag } from "lucide-react";

import type { Member } from "./types";

type Props = {
  /** 表示するメンバー (検索でフィルタ済みのものを渡す想定)。 */
  members: Member[];
  /** 検索クエリ。 */
  search: string;
  /** 検索クエリ変更時。 */
  onSearchChange: (next: string) => void;
  /** メンバーの選択状態をトグル。 */
  onToggle: (id: string) => void;
  /** 「全選択」を押した時。 */
  onSelectAll: () => void;
};

export function MemberList({
  members,
  search,
  onSearchChange,
  onToggle,
  onSelectAll,
}: Props) {
  return (
    <div className="flex w-full flex-col gap-3">
      {/* 検索ボックス + タグ絞り込みボタン (タグ機能は将来用) */}
      <div className="flex items-center gap-2">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-full border border-[var(--flamingo-soft)] bg-white px-4 text-sm text-[var(--muted-foreground)]">
          <Search className="h-4 w-4 text-[var(--flamingo-soft)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="メンバーを検索"
            className="w-full bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]/80"
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

      {/* 全選択ピル。クリックで親に通知。 */}
      <div>
        <button
          type="button"
          onClick={onSelectAll}
          className="inline-flex items-center rounded-full bg-[var(--flamingo)] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[var(--flamingo-deep)]"
        >
          全選択
        </button>
      </div>

      {/* メンバーリスト本体 */}
      <ul className="flex flex-col gap-3">
        {members.length === 0 ? (
          <li className="px-1 text-sm text-[var(--muted-foreground)]">
            該当するメンバーがいません
          </li>
        ) : (
          members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                aria-label={m.name}
                checked={m.selected}
                onChange={() => onToggle(m.id)}
                className="h-5 w-5 shrink-0 rounded-md border-2 border-[var(--flamingo-soft)] accent-[var(--flamingo)]"
              />
              <span className="text-sm text-[var(--foreground)]/80">
                {m.name}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
