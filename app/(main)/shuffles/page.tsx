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
import { Shuffle } from "lucide-react";

import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

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

export default function ShufflesPage() {
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

  const [activeDialog, setActiveDialog] = useState<"card" | "shuffle" | null>(null)

  // ── 描画 ───────────────────────────────────────────────────────
  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 text-xl font-bold text-[var(--shuffle)]">
        シャッフル画面
      </h1>

      {/* 上段: Canvas (左、伸縮) + メンバーリスト (右、280px固定) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="relative min-h-[420px] py-[26px]">
          <CardContent className="px-8">
            <div className="mb-4 flex items-center gap-3 text-base font-bold text-[var(--shuffle)]">
              <span>
                0 / {selectedCount} 人
              </span>
              <div className="ml-auto flex gap-3">
                <button
                  type="button"
                  className="px-4 py-1 items-center rounded-full bg-white text-center text-base font-bold border-2 border-[var(--shuffle)] text-[var(--shuffle)] transition-colors hover:text-[var(--shuffle-deep)] hover:border-[var(--shuffle-deep)] "
                >
                  詳細条件設定
                </button>
                <button
                  type="button"
                  className="px-4 py-1 items-center rounded-full bg-[var(--shuffle)] text-center text-base font-bold border-2 border-[var(--shuffle)] text-white transition-colors hover:bg-[var(--shuffle-deep)] hover:border-[var(--shuffle-deep)] "
                >
                  レイアウト編集
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
      <div className="mt-2">
        <h2 className="mb-2 text-base font-semibold text-[var(--shuffle)]">
          座席レイアウト選択
        </h2>

        <div className="flex flex-wrap items-center gap-6">
          {/* レイアウト1 */}
          <Card className="relative h-41 w-70"
                onClick={() => setActiveDialog("card")}
          >
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
            onClick={() => setActiveDialog("shuffle")}
            className="ml-auto h-32 w-32 place-items-center rounded-full bg-[var(--shuffle)] text-center leading-tight text-white shadow-lg shadow-[var(--shuffle)]/30 transition-colors hover:bg-[var(--shuffle-deep)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--shuffle)]/30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Shuffle className="h-6 w-6" />
            <span className="text-base font-bold ">シャッフル</span>
          </button>
          {/* シャッフル結果ダイアログ */}
          <Dialog 
            open={activeDialog === "shuffle"}
            onOpenChange={(open) => !open && setActiveDialog(null)}
          >
            <DialogContent className="w-250 h-138 max-w-none max-h-none sm:max-w-none p-0 border-0 bg-transparent shadow-none overflow-visible [&>button]:hidden">

              {/* グラデーション枠 */}
              <div className="h-full w-full rounded-xl bg-gradient-to-br from-[var(--flamingo)] via-[var(--flamingo-soft)] to-[var(--shuffle)] p-[4px]">
                <div className="h-full w-full rounded-xl bg-white overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="my-4 text-center text-xl font-bold text-[var(--shuffle)]">
                      シャッフル結果
                    </DialogTitle>
                  </DialogHeader>

                  {/* 結果プレビュー（画像のグレー部分想定） */}
                  <div className="mx-auto w-150 h-90 rounded-2xl bg-[var(--muted-foreground)]" />

                  {/* 保存ボタン */}
                  <div className="flex justify-center">
                    <button
                      className="my-3 px-4 py-1 items-center rounded-full bg-[var(--shuffle)] text-center text-base font-bold text-white transition-colors hover:bg-[var(--shuffle-deep)] "
                    >
                      保存
                    </button>
                  </div>
                  {/* URL + コピー */}
                  <div className="flex justify-center">
                    <div className="flex h-10 w-130 overflow-hidden rounded-full border-2 border-[var(--shuffle)]">
                    <Input
                      value="https://chafflamingo.com/shuffle/xxxx"
                      readOnly
                        className="h-full flex-1 rounded-none border-0 bg-white px-6 text-[20px] focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <button
                        className="h-full w-15 flex items-center justify-center bg-[var(--shuffle)] text-base font-bold text-white transition-colors hover:bg-[var(--shuffle-deep)]"
                      >
                        コピー
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* レイアウト選択確認ダイアログ */}
          <Dialog 
            open={activeDialog === "card"}
            onOpenChange={(open) => !open && setActiveDialog(null)}
          >
              <DialogContent className="w-100 h-50 max-w-none max-h-none sm:max-w-none p-0 border-0 bg-transparent shadow-none overflow-visible [&>button]:hidden">
                <VisuallyHidden>
                  <DialogTitle>選択確認ダイアログ</DialogTitle>
                </VisuallyHidden>
                {/* グラデーション枠 */}
                <div className="h-full w-full rounded-xl bg-gradient-to-br from-[var(--flamingo)] via-[var(--flamingo-soft)] to-[var(--shuffle)] p-[4px]">
                  <div className="h-full w-full rounded-xl bg-white p-8 flex flex-col items-center justify-center gap-8">

                    <p className="text-[20px] font-bold text-[var(--shuffle)] text-center">
                      このレイアウトを選択しますか？
                    </p>

                    <div className="flex gap-6">
                      <button className="h-12 w-32 rounded-full text-[var(--shuffle)] font-bold border-2 border-[var(--shuffle)] hover:text-[var(--shuffle-deep)] hover:border-[var(--shuffle-deep)]">
                        キャンセル
                      </button>

                      <button className="h-12 w-32 rounded-full bg-[var(--shuffle)] text-white font-bold hover:bg-[var(--shuffle-deep)]">
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              </DialogContent>
          </Dialog>
        </div>
      </div>
    </main>
  );

}