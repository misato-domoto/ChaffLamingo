/**
 * クイックシャッフル画面 (= "/" のホーム)
 * --------------------------------------------------------------------
 * Server Component。members.json / tags.json を読んで、クライアント側の
 * QuickShuffleScreen に渡すだけの薄いコンテナ。
 *
 * 既存メンバーを登録/編集/削除すると、Server Action 側の
 * revalidatePath("/") により、この page が再フェッチされて
 * 最新のメンバー一覧が流れてくる。
 */

import { QuickShuffleScreen } from "@/components/shuffle/quick-shuffle-screen";
import { getMembers, getTags } from "@/lib/data";

export default async function QuickShufflePage() {
  const [members, tags] = await Promise.all([getMembers(), getTags()]);
  return <QuickShuffleScreen members={members} tags={tags} />;
}


