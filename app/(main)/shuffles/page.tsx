"use client";

/**
 * シャッフル画面 (= "/shuffles")
 * --------------------------------------------------------------------
 */

import { useMemo, useState } from "react";
import { Star } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card";
import { MemberList } from "@/components/shuffle/member-list";
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
  const [search, setSearch] = useState("");

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

  // ── 描画 ───────────────────────────────────────────────────────
  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 text-[32px] font-bold text-[var(--shuffle)]">
        シャッフル画面
      </h1>

      {/* 上段: Canvas (左、伸縮) + メンバーリスト (右、280px固定) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="relative min-h-105 py-8">
          <CardContent className="px-8">
            <div className="mb-4 flex items-center gap-3 text-[32px] font-bold text-[var(--shuffle)]">
              <span>
                0 / {selectedCount} 人
              </span>
              <div className="ml-auto flex gap-3">
                <button
                  type="button"
                  className="h-14 w-54 place-items-center rounded-full bg-white text-center text-[24px] font-bold border-2 border-[var(--shuffle)] text-[var(--shuffle)] transition-colors hover:text-[var(--shuffle-deep)] hover:border-[var(--shuffle-deep)] "
                >
                  レイアウト編集
                </button>
                <button
                  type="button"
                  className="h-14 w-54 place-items-center rounded-full bg-[var(--shuffle)] text-center text-[24px] font-bold text-white transition-colors hover:bg-[var(--shuffle-deep)] "
                >
                  詳細条件設定
                </button>
              </div>
            </div>
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

      {/* 下段: レイアウト選択 */}
      <div className="mt-8">
        <h2 className="mb-4 text-[32px] font-bold text-[var(--shuffle)]">
          座席レイアウト選択
        </h2>

        <div className="flex flex-wrap items-center gap-6">
          {/* レイアウト1 */}
          <Card className="relative h-41 w-70">
            <CardContent className="p-0">
              <div className="absolute top-2 right-2">
                <Star className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
              <div className="absolute bottom-2 left-4 text-[16px] font-bold text-[var(--muted-foreground)]">
                レイアウト名
              </div>
            </CardContent>
          </Card>
          {/* レイアウト2 */}
          <Card className="relative h-41 w-70">
            <CardContent className="p-0">
              <div className="absolute top-2 right-2">
                <Star className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
              <div className="absolute bottom-2 left-4 text-[16px] font-bold text-[var(--muted-foreground)]">
                レイアウト名
              </div>
            </CardContent>
          </Card>
          {/* レイアウト3 */}
          <Card className="relative h-41 w-70">
            <CardContent className="p-0">
              <div className="absolute top-2 right-2">
                <Star className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
              <div className="absolute bottom-2 left-4 text-[16px] font-bold text-[var(--muted-foreground)]">
                レイアウト名
              </div>
            </CardContent>
          </Card>

          {/* メインアクション */}
          <button
            type="button"
            className="ml-auto grid h-32 w-32 place-items-center rounded-full bg-[var(--shuffle)] text-center text-base font-bold leading-tight text-white shadow-lg shadow-[var(--shuffle)]/30 transition-colors hover:bg-[var(--shuffle-deep)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--shuffle)]/30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            シャッフル
          </button>
        </div>
      </div>
    </main>
  );
}
