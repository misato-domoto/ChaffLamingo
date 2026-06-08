/**
 * タグ一覧画面 (= "/tags")
 * --------------------------------------------------------------------
 * Server Component。fs から tags.json と members.json を読んで、
 * 表示+操作の本体は Client Component (TagsScreen) に props で渡す。
 *
 * Server Action 側で revalidatePath("/tags") が呼ばれるので、
 * 追加/編集/削除のあとはここの page.tsx が再レンダリングされて
 * 新しいデータが流れてくる (= 自分で再フェッチする必要は無い)。
 */

import { getMembers, getTags } from "@/lib/data";
import { TagsScreen } from "@/components/tags/tags-screen";

export default async function TagsPage() {
  const [tags, members] = await Promise.all([getTags(), getMembers()]);
  return <TagsScreen tags={tags} members={members} />;
}
