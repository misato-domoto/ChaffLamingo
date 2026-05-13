/**
 * タグ管理画面 (= "/tags")
 * --------------------------------------------------------------------
 * 開発スタブ。詳細な開発手順は app/(main)/layouts/page.tsx の冒頭コメント参照。
 */

import { Card, CardContent } from "@/components/ui/card";

export default function TagsPage() {
  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 text-xl font-bold text-[var(--shuffle)]">
        タグ一覧
      </h1>

      {/* TODO: タグ一覧を表示。
          プレゼンテーション部品は components/tags/ に作成する想定。 */}
      <Card>
        <CardContent className="py-8 text-sm text-[var(--muted-foreground)]">
          タグ一覧を表示
        </CardContent>
      </Card>
    </main>
  );
}
