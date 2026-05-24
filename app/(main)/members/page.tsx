/**
 * メンバー管理画面 (= "/members")
 * --------------------------------------------------------------------
 * 開発スタブ。詳細な開発手順は app/(main)/layouts/page.tsx の冒頭コメント参照。
 */

import { Card, CardContent } from "@/components/ui/card";

export default function MembersPage() {
  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 text-xl font-bold text-[var(--shuffle)]">
        メンバー管理
      </h1>

      {/* TODO: メンバーの追加 / 編集 / 削除、タググルーピング、CSV import など。
          プレゼンテーション部品は components/members/ に作成する想定。 */}
      <Card>
        <CardContent className="py-8 text-sm text-[var(--muted-foreground)]">
          ここでメンバーの登録/編集/タグ付けを行う予定。
        </CardContent>
      </Card>
    </main>
  );
}
