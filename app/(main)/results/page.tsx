/**
 * シャッフル結果一覧画面 (= "/results")
 * --------------------------------------------------------------------
 * Server Component。results-pictures/ ディレクトリの PNG を一覧して
 * Client (ResultsScreen) に渡す。
 *
 * 結果画像はシャッフル画面でシャッフル結果を保存した時に書き込まれる
 * (Phase 4 で接続)。
 */

import { listResultImages } from "@/lib/data";
import { ResultsScreen } from "@/components/results/results-screen";

export default async function ResultsPage() {
  const results = await listResultImages();
  return <ResultsScreen results={results} />;
}
