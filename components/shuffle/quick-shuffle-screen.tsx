"use client";

/**
 * クイックシャッフル画面の本体 (Client Component)
 * --------------------------------------------------------------------
 * 旧 app/(main)/page.tsx のロジックを引き継ぎ、データを props 受け取りに変更:
 *   - members は members.json から渡される (id/name/pictureUrl/tagIds...)
 *   - tags は tags.json から渡される
 *
 * 選択状態 (どのメンバーをシャッフル対象にするか) は UI ローカルの state
 * (selectedIds: Set<string>) で管理。Member 型自体には selected フィールドを
 * 持たせず、ストレージとの責務分離を保つ。
 *
 * シャッフル戦略:
 *   - "テーブル数" と "1卓あたりの人数" は controls から自由に弄れる。
 *     この2つを変えると、配置がない状態 (= 空席) でも卓の枠と席だけは
 *     即座に Canvas に出る。
 *   - "クイックシャッフル" ボタンを押した瞬間、現在の選択メンバーを
 *     tableCount 卓に分配して assignments に固定する (= snapshot)。
 *   - シャッフル後にテーブル数/人数を変えても、既配置はフリーズしたまま
 *     (空卓・空席だけが増減する)。
 */

import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { TableCanvas } from "@/components/shuffle/table-canvas";
import { MemberList } from "@/components/shuffle/member-list";
import { ShuffleControls } from "@/components/shuffle/shuffle-controls";
import type { Member, Tag } from "@/lib/types";
import { getDisplayName } from "@/lib/types";

type Props = {
  members: Member[];
  tags: Tag[];
};

export function QuickShuffleScreen({ members, tags }: Props) {
  // ── 状態 ───────────────────────────────────────────────────────
  const [perTable, setPerTable] = useState(4);
  const [tableCount, setTableCount] = useState(3);
  const [search, setSearch] = useState("");

  /**
   * 選択状態 (どのメンバーをシャッフル対象とするか)。
   * - 初期値: 全メンバー選択 (新規追加されたメンバーも下の useEffect で自動追加)
   * - リストのチェックボックスでトグル、または「全選択」で一括変更
   */
const [deselectedIds, setDeselectedIds] = useState<Set<string>>(() => new Set());

  /** タグ絞り込み: 選択されたタグ id (OR 検索) */
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());

  /**
   * 直近のシャッフル結果スナップショット。
   * - null = まだ一度もシャッフルしていない (空席のみ描画)
   * - Member[][] = この配置を保持。controls 変更で再描画されても assignments
   *   自体は変わらず、derive 側 (displayTables) で見た目を調整。
   */
  const [assignments, setAssignments] = useState<Member[][]>([]);

  // members が更新されたら、新規 id を selectedIds に追加 (既存トグルは保持)
const selectedIds = useMemo(() => {
  const ids = new Set<string>();

  members.forEach((m) => {
    if (!deselectedIds.has(m.id)) {
      ids.add(m.id);
    }
  });

  return ids;
}, [members, deselectedIds]);

  // ── 派生値 ──────────────────────────────────────────────────────
  /** 検索 + タグ絞り込みの両方を適用したメンバー一覧 (右リスト用) */
  const filteredMembers = useMemo(
    () =>
      members.filter((m) => {
        const matchSearch = getDisplayName(m)
          .toLowerCase()
          .includes(search.trim().toLowerCase());
        const matchTag =
          filterTagIds.size === 0 ||
          (m.tagIds ?? []).some((tid) => filterTagIds.has(tid));
        return matchSearch && matchTag;
      }),
    [members, search, filterTagIds],
  );

  /**
   * シャッフル対象のメンバープール。
   * 「絞り込みで表示されている (filteredMembers)」かつ「選択されている (selectedIds)」
   * の両方を満たすメンバーを対象とする。
   * 絞り込み中はそのタグのメンバーだけがシャッフルされる動きになる。
   */
  const shufflablePool = useMemo(
    () => filteredMembers.filter((m) => selectedIds.has(m.id)),
    [filteredMembers, selectedIds],
  );

  /** 全選択中メンバー数 (絞り込み無視、表示用) */
  const totalSelectedCount = useMemo(
    () => members.filter((m) => selectedIds.has(m.id)).length,
    [members, selectedIds],
  );

  /** シャッフル対象人数 (絞り込み + 選択を両方反映) */
  const shufflableCount = shufflablePool.length;
  const isFilterActive = filterTagIds.size > 0;

  /** Canvas に渡すテーブル分配 (perTable / tableCount を反映、再シャッフルしない) */
  const displayTables: Member[][] = useMemo(() => {
    return Array.from({ length: tableCount }, (_, i) => {
      const assigned = assignments[i] ?? [];
      return assigned.slice(0, perTable);
    });
  }, [assignments, tableCount, perTable]);

  const seatedCount = displayTables.reduce((acc, t) => acc + t.length, 0);

  // ── アクション ──────────────────────────────────────────────────
  const toggleMember = (id: string) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * 「全選択」トグル: 絞り込み結果に対して動く (= 表示中のメンバーだけが対象)。
   * 全員選択済なら一括解除、そうでなければ一括選択。
   */
  const selectAll = () => {
    const allSelected =
      filteredMembers.length > 0 &&
      filteredMembers.every((m) => selectedIds.has(m.id));
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      filteredMembers.forEach((m) => {
        if (allSelected) next.delete(m.id);
        else next.add(m.id);
      });
      return next;
    });
  };

  /**
   * クイックシャッフル本体。
   * - shufflablePool (絞り込み済み + 選択済み) を Fisher–Yates で並び替え、
   *   tableCount 卓にラウンドロビンで均等配分する (各卓は最大 perTable 人)。
   * - 結果を assignments にスナップショットとして保存する。
   *
   * タグで絞り込んでいる場合は、絞り込まれているメンバーだけがシャッフル
   * 対象になる (= 表示外のメンバーは含まれない)。
   */
  const shuffle = () => {
    if (shufflablePool.length === 0 || tableCount <= 0) return;

    const shuffled = [...shufflablePool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const capacity = perTable * tableCount;
    const toAssign = shuffled.slice(0, capacity);
    const result: Member[][] = Array.from({ length: tableCount }, () => []);
    toAssign.forEach((m, i) => {
      result[i % tableCount].push(m);
    });
    setAssignments(result);
  };

  // ── 描画 ───────────────────────────────────────────────────────
  return (
    <main className="px-4 py-4 sm:px-8 sm:py-6">
      <h1 className="mb-4 text-xl font-bold text-flamingo">
        クイックシャッフル画面
      </h1>

      {/* 上段: Canvas (左、伸縮) + メンバーリスト (右、固定幅) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="relative min-h-105 py-8">
          <CardContent className="px-8">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-base font-bold text-flamingo">
              <span>
                {seatedCount} / {totalSelectedCount} 人
              </span>
              {/* タグ絞り込み中: シャッフル対象が制限されていることを明示 */}
              {isFilterActive && (
                <span className="text-xs font-medium text-muted-foreground">
                  (タグ絞り込み中: {shufflableCount} 人がシャッフル対象)
                </span>
              )}
              {/* シャッフル後のはみ出し警告 */}
              {assignments.length > 0 && seatedCount < shufflableCount && (
                <span className="text-xs font-medium text-muted-foreground">
                  ({shufflableCount - seatedCount} 人がはみ出しています)
                </span>
              )}
            </div>
            <TableCanvas tables={displayTables} perTable={perTable} />
          </CardContent>
        </Card>

        <div className="lg:pt-2">
          <MemberList
            members={filteredMembers}
            selectedIds={selectedIds}
            tags={tags}
            filterTagIds={filterTagIds}
            search={search}
            onSearchChange={setSearch}
            onToggle={toggleMember}
            onSelectAll={selectAll}
            onFilterTagsChange={setFilterTagIds}
          />
        </div>
      </div>

      {/* 下段: 操作パネル */}
      <div className="mt-8">
        <ShuffleControls
          perTable={perTable}
          onPerTableChange={setPerTable}
          tableCount={tableCount}
          onTableCountChange={setTableCount}
          onShuffle={shuffle}
          // 絞り込み中なら絞り込まれたプールに合わせて enable/disable
          canShuffle={shufflableCount > 0}
        />
      </div>
    </main>
  );
}
