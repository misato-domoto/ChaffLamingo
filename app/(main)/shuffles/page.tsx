/**
 * シャッフル画面 (= "/shuffles")
 * --------------------------------------------------------------------
 * Server Component。members.json / tags.json / layouts/ を読み、
 * Client の ShuffleScreen に渡す。
 */

import { getMembers, getTags, listLayouts } from "@/lib/data";
import { ShuffleScreen } from "@/components/shuffle/shuffle-screen";

export default async function ShufflesPage() {
  const [members, tags, layouts] = await Promise.all([
    getMembers(),
    getTags(),
    listLayouts(),
  ]);
  return (
    <ShuffleScreen members={members} tags={tags} layouts={layouts} />
  );
}
