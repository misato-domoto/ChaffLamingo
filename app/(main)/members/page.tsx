/**
 * メンバー登録・編集画面 (= "/members")
 * --------------------------------------------------------------------
 * Server Component。members.json と tags.json を読んで Client に渡すだけ。
 * 操作 (登録/編集/削除/画像アップロード) は MembersScreen 内で完結し、
 * Server Action 呼び出し後は revalidatePath によりこの page が再フェッチされる。
 */

import { getMembers, getTags } from "@/lib/data";
import { MembersScreen } from "@/components/members/members-screen";

export default async function MembersPage() {
  const [members, tags] = await Promise.all([getMembers(), getTags()]);
  return <MembersScreen members={members} tags={tags} />;
}
