/**
 * 設定画面 (= "/settings")
 * --------------------------------------------------------------------
 * 開発スタブ。詳細な開発手順は app/(main)/favorites/page.tsx の冒頭コメント参照。
 */

import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 text-xl font-bold text-flamingo">設定</h1>

      {/* TODO: テーマ切替、通知設定、アカウント連携、エクスポートなど。
          プレゼンテーション部品は components/settings/ に作成する想定。 */}
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          ここで一般設定 / 表示設定 / 連携設定などを行う予定。
        </CardContent>
      </Card>
    </main>
  );
}
