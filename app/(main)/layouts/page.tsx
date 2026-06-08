/**
 * 座席レイアウト編集画面 (= "/layouts")
 * --------------------------------------------------------------------
 * Server Component。URL クエリ ?name=XYZ が付いている場合は、そのレイアウトを
 * 取得して SeatLayoutEditor の初期値として渡す (= "編集モード")。
 * 付いてなければ空のキャンバスから始まる (= "新規モード")。
 *
 * 想定する遷移:
 *   /layouts                    新規レイアウト作成
 *   /layouts?name=XYZ           既存レイアウト "XYZ" を編集
 *     ↑ /shuffles の「レイアウト編集」ボタンからリンクされる予定
 */

import { getLayout } from "@/lib/data";
import SeatLayoutEditor from "./components/SeatLayoutEditor";

export default async function LayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { name } = await searchParams;
  const initialLayout = name ? await getLayout(name) : null;
  return <SeatLayoutEditor initialLayout={initialLayout} />;
}
