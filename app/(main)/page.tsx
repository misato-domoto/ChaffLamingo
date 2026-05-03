"use client";

/**
 * クイックシャッフル画面 (= "/" のホーム)
 * --------------------------------------------------------------------
 * このファイルが「画面ごとの page.tsx の見本」になっています。
 *
 * 設計方針:
 * - 状態とロジックは "コンテナ" であるこのファイルに集約。
 * - 表示は components/shuffle/ 配下の "プレゼンテーション" に委譲。
 * - 親→子は props で渡す、子→親は callback で通知する古典的な構成。
 *
 * シャッフルの状態モデル:
 * - "テーブル数" と "1卓あたりの人数" は controls から自由に弄れる。
 *   この2つを変えると、配置がない状態 (= 空席) でも卓の枠と席だけは
 *   即座に Canvas に出る。シャッフルボタンを押す前に「こんなレイアウトに
 *   なる」が掴めるのが狙い。
 * - "クイックシャッフル" ボタンを押した瞬間、現在の選択メンバーを
 *   tableCount 卓に分配して assignments に固定する (= snapshot)。
 * - シャッフル後にテーブル数を増やすと、新しい卓は空のまま追加される
 *   (= 既に配置されたメンバーは再分配されない)。1卓あたりの人数を
 *   減らすと余ったメンバーは表示から外れるが、内部的には保持されるので、
 *   人数を戻すと再表示される。再シャッフルしない限り配置は維持される。
 *
 * チームメンバーが他画面を作るときの目安:
 * 1. components/<画面名>/ にプレゼンテーション部品を作る (props でデータを受ける)
 * 2. app/(main)/<画面名>/page.tsx で状態を持って組み立てる
 * 3. 同じパターンが3画面以上で出てきたら components/ui/ に昇格させる (Rule of Three)
 */

import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { TableCanvas } from "@/components/shuffle/table-canvas";
import { MemberList } from "@/components/shuffle/member-list";
import { ShuffleControls } from "@/components/shuffle/shuffle-controls";
import type { Member } from "@/components/shuffle/types";

// 仮データ。後で API/DB に差し替える前提。
const INITIAL_MEMBERS: Member[] = [
  { id: "m01", name: "佐藤 一郎", selected: true },
  { id: "m02", name: "鈴木 二郎", selected: true },
  { id: "m03", name: "高橋 三子", selected: true },
  { id: "m04", name: "田中 四郎", selected: true },
  { id: "m05", name: "伊藤 五子", selected: true },
  { id: "m06", name: "渡辺 六郎", selected: true },
  { id: "m07", name: "山本 七子", selected: true },
  { id: "m08", name: "中村 八郎", selected: true },
  { id: "m09", name: "小林 九子", selected: true },
  { id: "m10", name: "加藤 十郎", selected: true },
  { id: "m11", name: "吉田 春", selected: true },
  { id: "m12", name: "山田 夏", selected: true },
  { id: "m13", name: "佐々木 秋", selected: false },
];

export default function ShufflePage() {
  // ── 状態 ───────────────────────────────────────────────────────
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [perTable, setPerTable] = useState(4);
  const [tableCount, setTableCount] = useState(3);
  const [search, setSearch] = useState("");

  /**
   * 直近のシャッフル結果のスナップショット。
   * - シャッフル前は []。Canvas は perTable / tableCount に従って
   *   空席で枠だけ描画される。
   * - シャッフル後は assignments[i] にテーブル i のメンバーが入る。
   *   その後 perTable / tableCount を変更しても、ここは書き換わらない
   *   (= 既配置はフリーズ)。再シャッフル時のみ更新される。
   */
  const [assignments, setAssignments] = useState<Member[][]>([]);

  // ── 派生値 ──────────────────────────────────────────────────────
  // 検索フィルタは表示用のみ。元データ (members) は維持する。
  const filteredMembers = useMemo(
    () =>
      members.filter((m) =>
        m.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [members, search],
  );

  // 選択中の人数 (リスト側のチェックボックスで選択されている数)。
  const selectedCount = useMemo(
    () => members.filter((m) => m.selected).length,
    [members],
  );

  /**
   * Canvas に渡す表示用テーブル一覧。
   * - 長さは常に tableCount 個 (足りない卓は空配列で埋める)。
   * - 既存の assignments を切り詰めてから渡す:
   *   ・perTable を増やす → 余りの席は空席として描画
   *   ・perTable を減らす → 表示から外す (assignments には残ってる)
   *   ・tableCount を増やす → 増えた分は空配列のまま (= 空卓)
   *   ・tableCount を減らす → 末尾を切り捨てて表示しない
   */
  const displayTables = useMemo<Member[][]>(() => {
    return Array.from({ length: tableCount }, (_, i) => {
      const assigned = assignments[i] ?? [];
      return assigned.slice(0, perTable);
    });
  }, [assignments, tableCount, perTable]);

  // ── アクション ──────────────────────────────────────────────────
  const toggleMember = (id: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m)),
    );
  };

  const selectAll = () => {
    // 全員既に選択済みなら解除、そうでなければ全選択 (トグル動作)
    const everyoneSelected = members.every((m) => m.selected);
    setMembers((prev) =>
      prev.map((m) => ({ ...m, selected: !everyoneSelected })),
    );
  };

  /**
   * クイックシャッフル本体。
   * - 選択中メンバーを Fisher–Yates で並び替え、tableCount 卓に
   *   ラウンドロビンで均等配分する (各卓は最大 perTable 人)。
   * - 結果を assignments にスナップショットとして保存する。
   *   以降、controls をいじっても assignments は変わらない。
   */
  const shuffle = () => {
    const pool = members.filter((m) => m.selected);
    if (pool.length === 0 || tableCount <= 0) return;

    const shuffled = [...pool];
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

  // 配置されているメンバーの実数 (Canvas に出ている人数)
  const seatedCount = displayTables.reduce((acc, t) => acc + t.length, 0);

  // ── 描画 ───────────────────────────────────────────────────────
  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 text-xl font-bold text-[var(--flamingo)]">
        クイックシャッフル画面
      </h1>

      {/* 上段: Canvas (左、伸縮) + メンバーリスト (右、280px固定) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="relative min-h-[420px] py-8">
          <CardContent className="px-8">
            <div className="mb-4 flex items-center gap-3 text-base font-bold text-[var(--flamingo)]">
              <span>
                {seatedCount} / {selectedCount} 人
              </span>
              {assignments.length > 0 && seatedCount < selectedCount && (
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  ({selectedCount - seatedCount} 人がはみ出しています)
                </span>
              )}
            </div>
            <TableCanvas tables={displayTables} perTable={perTable} />
          </CardContent>
        </Card>

        <div className="lg:pt-2">
          <MemberList
            members={filteredMembers}
            search={search}
            onSearchChange={setSearch}
            onToggle={toggleMember}
            onSelectAll={selectAll}
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
          canShuffle={selectedCount > 0}
        />
      </div>
    </main>
  );
}
