/**
 * お気に入り画面 (= "/favorites")
 * --------------------------------------------------------------------
 * チームメンバー向けの開発スタブ。
 * 同じパターン (このファイルを置く / 必要なら components/favorites/ を作る) で
 * 自分の担当画面を実装してください。
 *
 * 開発手順の目安:
 *   1) components/favorites/ にプレゼンテーション部品を作る
 *   2) このファイルで状態を持って組み立てる ("クイックシャッフル画面" と同じ)
 *   3) 必要なら types.ts を切る、API 呼び出しは別ファイル (例: lib/api/...) に分離
 *
 * チェックリスト (自画面ができたかの目安):
 *   [ ] サイドバーから / ↔ /favorites の切替がスムーズに動く
 *   [ ] モバイルとデスクトップで崩れない
 *   [ ] 状態を URL クエリに残すかどうか決める (例: 検索条件)
 */

import { Card, CardContent } from "@/components/ui/card";

export default function FavoritesPage() {
  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 text-xl font-bold text-[var(--flamingo)]">
        お気に入り
      </h1>

      {/* TODO: お気に入りグループの一覧を表示。
          プレゼンテーション部品は components/favorites/ に作成する想定。 */}
      <Card>
        <CardContent className="py-8 text-sm text-[var(--muted-foreground)]">
          ここに「保存したシャッフル設定」「よく組むメンバー構成」などを並べる予定。
        </CardContent>
      </Card>
    </main>
  );
}
