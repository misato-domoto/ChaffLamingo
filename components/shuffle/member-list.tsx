"use client";

/**
 * メンバー一覧 (シャッフル系画面の右ペイン)
 * --------------------------------------------------------------------
 * - 検索 + タグ絞り込み + 全選択 + 個別チェックの UI を提供する。
 * - "コントロールド" コンポーネント: 状態は親 (画面コンテナ) が持ち、
 *   ここは表示と onChange のディスパッチのみ。
 *   選択状態は親側で Set<string> で持つ前提 (Member 型自体に "selected" を
 *   持たせず、ストレージとの責務を分けるため)。
 *
 * 絞り込み:
 *   - 検索: 名前部分一致
 *   - タグ: 🏷️ボタンで開くダイアログで複数選択 (OR検索)。1つでも一致したら表示。
 */

import { useState } from "react";
import { Search, Tag as TagIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Member, Tag } from "@/lib/types";
import { getDisplayName } from "@/lib/types";
import { Card, CardContent } from "../ui/card";

type Props = {
  /** 表示するメンバー (検索 + タグ絞り込み済みのものを親から渡す)。 */
  members: Member[];
  /** 選択中のメンバー id 集合。 */
  selectedIds: Set<string>;
  /** タグ一覧 (絞り込みダイアログ用)。 */
  tags: Tag[];
  /** 現在絞り込みに使われているタグ id 集合 (空なら絞り込み無し)。 */
  filterTagIds: Set<string>;
  /** 検索クエリ。 */
  search: string;
  onSearchChange: (next: string) => void;
  /** メンバーの選択状態をトグル。 */
  onToggle: (id: string) => void;
  /** 「全選択」を押した時。表示中メンバー対象に動く前提。 */
  onSelectAll: () => void;
  /** 絞り込みタグ集合を差し替える (ダイアログの「決定」「クリア」で使用)。 */
  onFilterTagsChange: (next: Set<string>) => void;
  /**
   * 各行を draggable にして、dataTransfer に member.id をセットする。
   * シャッフル画面で椅子へドラッグ&ドロップ固定するために使う。
   */
  enableDrag?: boolean;
};

export function MemberList({
  members,
  selectedIds,
  tags,
  filterTagIds,
  search,
  onSearchChange,
  onToggle,
  onSelectAll,
  onFilterTagsChange,
  enableDrag = false,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  // ダイアログ内のローカル一時状態 (キャンセル時のために親 state とは別管理)
  const [draftTagIds, setDraftTagIds] = useState<Set<string>>(filterTagIds);

  const openFilterDialog = () => {
    setDraftTagIds(new Set(filterTagIds));
    setFilterOpen(true);
  };

  const toggleDraft = (tagId: string) => {
    setDraftTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const applyFilter = () => {
    onFilterTagsChange(draftTagIds);
    setFilterOpen(false);
  };

  const clearFilter = () => {
    setDraftTagIds(new Set());
    onFilterTagsChange(new Set());
    setFilterOpen(false);
  };

  return (
    <Card className="p-4">
          <CardContent className="p-0">
    <div className="flex w-full flex-col gap-3">
      {/* 検索 + タグ絞り込みボタン */}
      <div className="flex items-center gap-2">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-full border border-flamingo-soft bg-white px-4 text-sm text-muted-foreground">
          <Search className="h-4 w-4 text-flamingo-soft" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="メンバーを検索"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-(--muted-foreground)/80"
          />
        </label>
        <button
          type="button"
          onClick={openFilterDialog}
          aria-label="タグで絞り込み"
          aria-pressed={filterTagIds.size > 0}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-flamingo-soft transition-colors ${
            filterTagIds.size > 0
              ? "bg-flamingo text-white"
              : "bg-white text-flamingo hover:bg-flamingo-tint"
          }`}
        >
          <TagIcon className="h-4 w-4" />
        </button>
      </div>

      {/* 全選択ピル */}
      <div>
        <button
          type="button"
          onClick={onSelectAll}
          className="inline-flex items-center rounded-full bg-flamingo px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-flamingo-deep"
        >
          全選択
        </button>
      </div>

      {/* メンバーリスト */}
      <ul className="flex max-h-110 flex-col gap-3 overflow-y-auto">
        {members.length === 0 ? (
          <li className="px-1 text-sm text-muted-foreground">
            {filterTagIds.size > 0 || search.length > 0
              ? "該当するメンバーがいません"
              : "メンバーが登録されていません (/members で登録してください)"}
          </li>
        ) : (
          members.map((m) => (
            <li
              key={m.id}
              className={`flex items-center gap-3 px-1 ${enableDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
              draggable={enableDrag}
              onDragStart={(e) => {
                if (!enableDrag) return;
                e.dataTransfer.setData("text/plain", m.id);
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              <input
                type="checkbox"
                aria-label={getDisplayName(m)}
                checked={selectedIds.has(m.id)}
                onChange={() => onToggle(m.id)}
                className="h-5 w-5 shrink-0 rounded-md border-2 border-flamingo-soft accent-flamingo"
              />
              <span className="text-sm text-(--foreground)/80">
                {getDisplayName(m) || "(名無し)"}
              </span>
            </li>
          ))
        )}
      </ul>

      {/* タグ絞り込みダイアログ */}
      <Dialog
        open={filterOpen}
        onOpenChange={(open) => !open && setFilterOpen(false)}
      >
        <DialogContent className="w-[min(96vw,600px)] max-w-none border-0 bg-transparent p-0 shadow-none overflow-visible [&>button]:hidden">
          <div className="rounded-xl bg-linear-to-br from-flamingo via-flamingo-soft to-shuffle p-1">
            <div className="rounded-xl bg-white px-6 py-4">
              <DialogHeader>
                <DialogTitle className="mb-5 text-center text-xl font-bold text-flamingo">
                  タグで絞り込み
                </DialogTitle>
              </DialogHeader>

              <ul className="max-h-75 overflow-y-auto rounded-md border border-flamingo-soft bg-(--flamingo-tint)/40 p-2">
                {tags.length === 0 ? (
                  <li className="px-2 py-3 text-sm text-muted-foreground">
                    タグがまだ登録されていません (/tags で追加してください)
                  </li>
                ) : (
                  tags.map((tag) => (
                    <li
                      key={tag.id}
                      className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={draftTagIds.has(tag.id)}
                        onChange={() => toggleDraft(tag.id)}
                        className="h-4 w-4 accent-flamingo"
                      />
                      <span className="text-sm">{tag.name}</span>
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={clearFilter}
                  className="rounded-full border border-flamingo px-4 py-1 text-base font-bold text-flamingo hover:bg-flamingo-tint"
                >
                  クリア
                </button>
                <button
                  type="button"
                  onClick={applyFilter}
                  className="rounded-full bg-flamingo px-4 py-1 text-base font-bold text-white hover:bg-flamingo-deep"
                >
                  決定
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </CardContent>
    </Card>
  );
}
