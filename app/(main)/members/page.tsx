"use client";

/**
 * メンバー管理画面 (= "/members")
 * --------------------------------------------------------------------
 * 開発スタブ。詳細な開発手順は app/(main)/layouts/page.tsx の冒頭コメント参照。
 */

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MemberList } from "@/components/shuffle/member-list";
import type { Member } from "@/components/shuffle/types";
import Camera3LineIcon from "remixicon-react/Camera3LineIcon";

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

export default function MembersPage() {
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

  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 text-xl font-bold text-[var(--shuffle)]">
        メンバー登録・編集
      </h1>

      {/* TODO: メンバーの追加 / 編集 / 削除、タググルーピング、CSV import など。
          プレゼンテーション部品は components/members/ に作成する想定。 */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="relative min-h-[420px] py-[26px]">
          <CardContent className="px-8 flex flex-col h-full">
            <div className="mb-4 flex items-center gap-3 text-base font-bold text-shuffle">
              <div className="flex items-center gap-4">
                <button className="w-32 h-32 rounded-full bg-shuffle-tint text-shuffle flex items-center justify-center">
                  <Camera3LineIcon className="w-12 h-12" />
                </button>
                <div className="flex flex-col gap-4">
                  <div>
                    <div>
                      <input type='text' className='w-full bg-shuffle-tint text-shuffle rounded-sm px-4 py-1' placeholder='名前'/>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div>
                        <input type='date' className='w-48 bg-shuffle-tint text-shuffle rounded-sm px-4 py-1'/>
                    </div>
                    <div>
                        <select
                          className="bg-shuffle-tint text-shuffle rounded-sm px-3 py-1"
                          defaultValue=""
                        >
                          <option value="" disabled>性別</option>
                          <option value="male">男性</option>
                          <option value="female">女性</option>
                          <option value="unknown">未回答</option>
                        </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-bold">タグ設定</h2>
                <button className="px-2 py-1 items-center rounded-sm bg-white text-center text-sm font-bold text-shuffle border border-shuffle">編集</button>
              </div>
              <div>
                <div className="mb-2">
                  <select
                    className="bg-shuffle-tint text-shuffle rounded-sm px-3 py-1"
                    defaultValue=""
                  >
                    <option value="" disabled>タグ</option>
                    <option value="male">システムソリューション事業部</option>
                    <option value="female">元吹奏楽部</option>
                    <option value="unknown">フットサル</option>
                  </select>
                </div>
                <div className="mb-2">
                  <select
                    className="bg-shuffle-tint text-shuffle rounded-sm px-3 py-1"
                    defaultValue=""
                  >
                    <option value="" disabled>タグ</option>
                    <option value="male">システムソリューション事業部</option>
                    <option value="female">元吹奏楽部</option>
                    <option value="unknown">フットサル</option>
                  </select>
                </div>
                <div className="mb-2">
                  <select
                    className="bg-shuffle-tint text-shuffle rounded-sm px-3 py-1"
                    defaultValue=""
                  >
                    <option value="" disabled>タグ</option>
                    <option value="male">システムソリューション事業部</option>
                    <option value="female">元吹奏楽部</option>
                    <option value="unknown">フットサル</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-auto flex justify-between">
              <button
                type="button"
                className="px-4 py-1 items-center rounded-full bg-flamingo text-center text-base font-bold text-white"
              >
                削除
              </button>
              <button
                type="button"
                className="px-4 py-1 items-center rounded-full bg-shuffle text-center text-base font-bold text-white"
              >
                登録
              </button>
            </div>
          </CardContent>
        </Card>

        {/* メンバーリスト */}
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

    </main>
  );
}
