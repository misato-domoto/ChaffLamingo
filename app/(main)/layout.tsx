/**
 * (main) Route Group の共通レイアウト
 * --------------------------------------------------------------------
 * - "(main)" は Next.js の route group。括弧つきフォルダは URL に
 *   現れず、複数ページで同じ layout を共有するための仕組み。
 * - 例: app/(main)/layout.tsx が
 *     /             (= app/(main)/page.tsx)
 *     /favorites    (= app/(main)/favorites/page.tsx)
 *     /members
 *     /settings
 *   の全てに適用される。
 * - チームメンバーは各 page.tsx だけを書けば、サイドバーは自動で残る。
 *
 * スクロール戦略:
 * - 親は h-screen (= 100vh 固定) + overflow-hidden で「ページ全体は
 *   スクロールしない」状態にする。
 * - サイドバーはこの 100vh の範囲で flex stretch するので、初期表示時の
 *   ビューポート高さに収まる「固定の長さ」になる。
 * - 右ペイン側は overflow-y-auto なので、コンテンツが多い画面では
 *   ここだけが内部スクロールする。
 * - 結果: サイドバーは画面に張り付いたまま、右側だけがスクロールする。
 */

import { Sidebar } from "@/components/layout/sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />
      {/* 右ペイン: 各ページの page.tsx がここに描画される。
          コンテンツが縦に溢れたときはここだけがスクロールする。 */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
