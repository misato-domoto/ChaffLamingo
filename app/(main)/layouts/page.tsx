/**
 * 座席レイアウト編集画面 (= "/layouts")
 * --------------------------------------------------------------------
 * チームメンバー向けの開発スタブ。
 * 同じパターン (このファイルを置く / 必要なら components/layouts/ を作る) で
 * 自分の担当画面を実装してください。
 *
 * 開発手順の目安:
//  *   1) components/layouts/ にプレゼンテーション部品を作る
//  *   2) このファイルで状態を持って組み立てる ("クイックシャッフル画面" と同じ)
//  *   3) 必要なら types.ts を切る、API 呼び出しは別ファイル (例: lib/api/...) に分離
//  *
//  * チェックリスト (自画面ができたかの目安):
//  *   [ ] サイドバーから / ↔ /layouts の切替がスムーズに動く
//  *   [ ] モバイルとデスクトップで崩れない
//  *   [ ] 状態を URL クエリに残すかどうか決める (例: 検索条件)
//  */

import SeatLayoutEditor from "./components/SeatLayoutEditor";

// import { Card, CardContent } from "@/components/ui/card";

// export default function LayoutsPage() {
//   return (
//     <main className="px-8 py-6">
//       <h1 className="mb-4 text-xl font-bold text-[var(--shuffle)]">
//         座席レイアウト編集
//       </h1>

//       {/* TODO: 座席レイアウト編集を表示。
//           プレゼンテーション部品は components/layouts/ に作成する想定。 */}
//       <Card>
//         <CardContent className="py-8 text-sm text-[var(--muted-foreground)]">
//           座席レイアウト編集画面を作成
//         </CardContent>
//       </Card>
//     </main>
//   );
// }



export default function Page() {
  return <SeatLayoutEditor />;
}