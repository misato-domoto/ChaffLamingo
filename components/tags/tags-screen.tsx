"use client";

/**
 * タグ画面の本体 (Client Component)
 * --------------------------------------------------------------------
 * - 一覧表示・追加・編集・削除を担当。
 * - 状態はここに集約。データの CRUD は Server Action を呼ぶだけ。
 * - 視覚デザイン (タグ風の clip-path カード / グラデーション枠ダイアログ)
 *   はユーザー側のデザインを踏襲。
 *
 * ダイアログの状態モデル:
 *   - editDialog       … 追加/編集フォーム (null なら閉)
 *   - confirmSave      … 保存前確認 (登録しますか?)
 *   - confirmDelete    … 削除前確認 (削除しますか?)
 *   editDialog と confirmSave は同時に開かれる場合がある (= 確認が上に重なる)
 */

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { deleteTag, saveTag, setTagMembers } from "@/lib/data";
import type { Member, Tag } from "@/lib/types";

type Props = {
   tags: Tag[];
  members: Member[];
};

export function TagsScreen({ tags, members }: Props) {
  const [editDialog, setEditDialog] = useState<{ tag: Tag | null } | null>(
    null,
  );
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Tag | null>(null);

  const [tagName, setTagName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [isPending, startTransition] = useTransition();

  // 各タグに紐付くメンバー数 (一覧の補助表示用)
  const countByTag = new Map<string, number>();
  for (const m of members) {
    for (const tid of m.tagIds) {
      countByTag.set(tid, (countByTag.get(tid) ?? 0) + 1);
    }
  }

  // ── ダイアログを開く ─────────────────────────────────────────
  const openEdit = (tag: Tag | null) => {
    setTagName(tag?.name ?? "");
    setSelectedMemberIds(
      new Set(
        tag
          ? members.filter((m) => m.tagIds.includes(tag.id)).map((m) => m.id)
          : [],
      ),
    );
    setEditDialog({ tag });
  };

  const closeEdit = () => setEditDialog(null);

  // ── アクション ──────────────────────────────────────────────
  // 「保存」を押した時: 入力検証 → 確認ダイアログを開くだけ
  const requestSave = () => {
    if (!tagName.trim()) {
      alert("タグ名を入力してください");
      return;
    }
    setConfirmSave(true);
  };

  // 確認ダイアログで OK が押された時: 実際に Server Action を呼ぶ
  const performSave = () => {
    if (!editDialog) return;
    const name = tagName.trim();
    if (!name) return;
    startTransition(async () => {
      const saved = await saveTag({ id: editDialog.tag?.id, name });
      await setTagMembers(saved.id, Array.from(selectedMemberIds));
      setConfirmSave(false);
      closeEdit();
    });
  };

  const performDelete = () => {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteTag(confirmDelete.id);
      setConfirmDelete(null);
    });
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main className="h-screen sm:px-2 sm:py-6">
      <h1 className="mb-4 flex items-center gap-3 text-xl font-bold text-shuffle">
        タグ一覧
      </h1>

      {/* タグ一覧 (タグ風 clip-path のカードを並べる) */}
      {tags.length === 0 ? (
        <div>
          <Card className="p-8 mb-5">
            <CardContent className="p-0 text-center text-sm text-muted-foreground">
              まだタグが登録されていません。「＋」から作成してください。
            </CardContent>
          </Card>
          <Card
            className="relative h-41 w-85 rounded-none [clip-path:polygon(0_0,80%_0,100%_50%,80%_100%,0_100%)]"
            onClick={() => openEdit(null)}>
            <CardContent className="absolute top-[40%] left-[40%] p-0">
              <Plus className="h-10 w-10 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <Card
            className="relative h-41 w-85 rounded-none [clip-path:polygon(0_0,80%_0,100%_50%,80%_100%,0_100%)]"
            onClick={() => openEdit(null)}>
            <CardContent className="absolute top-[40%] left-[40%] p-0">
              <Plus className="h-10 w-10 text-muted-foreground" />
            </CardContent>
          </Card>
          {tags.map((tag) => {
            const count = countByTag.get(tag.id) ?? 0;
            return (
              <Card
                key={tag.id}
                className="relative h-41 w-85 rounded-none [clip-path:polygon(0_0,80%_0,100%_50%,80%_100%,0_100%)]"
              >
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => openEdit(tag)}
                    aria-label={`${tag.name} を編集`}
                    className="absolute right-20 top-2 hover:opacity-70"
                  >
                    <Pencil className="h-5 w-5 text-muted-foreground" />
                  </button>

                  <div className="absolute left-4 top-1/2 -translate-y-1/2 max-w-[60%] text-[16px] font-bold text-shuffle">
                    {tag.name}
                    <div className="mt-1 text-xs font-normal text-muted-foreground">
                      {count} 人に適用中
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(tag)}
                    aria-label={`${tag.name} を削除`}
                    className="absolute bottom-2 right-20 hover:opacity-70"
                  >
                    <Trash2 className="h-5 w-5 text-muted-foreground" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 追加 / 編集ダイアログ */}
      <Dialog
        open={editDialog !== null}
        onOpenChange={(open) => !open && closeEdit()}
      >
        <DialogContent className="w-[min(96vw,600px)] max-w-none border-0 bg-transparent p-0 shadow-none overflow-visible [&>button]:hidden">
          <div className="rounded-xl bg-linear-to-br from-flamingo via-flamingo-soft to-shuffle p-1">
            <div className="rounded-xl bg-white px-6 py-4">
              <DialogHeader>
                <DialogTitle className="mb-5 text-center text-xl font-bold text-shuffle">
                  {editDialog?.tag ? "タグ編集" : "タグ追加"}
                </DialogTitle>
              </DialogHeader>

              {/* タグ名 */}
              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-bold text-shuffle">
                  タグ名
                </span>
                <Input
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="例: システムソリューション事業部"
                  className="text-center font-bold text-shuffle"
                />
              </label>

              {/* 適用メンバー (チェックボックス一覧) */}
              <div className="mb-4">
                <span className="mb-2 block text-sm font-bold text-shuffle">
                  適用メンバー
                </span>
                <ul className="max-h-50 overflow-y-auto rounded-md border border-shuffle-soft bg-shuffle-tint/40 p-2">
                  {members.length === 0 ? (
                    <li className="px-2 py-3 text-sm text-muted-foreground">
                      メンバーがまだ登録されていません
                    </li>
                  ) : (
                    members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.has(m.id)}
                          onChange={() => toggleMember(m.id)}
                          className="h-4 w-4 accent-shuffle"
                        />
                        <span className="text-sm">{m.name}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* 保存ボタン → 確認ダイアログ */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={requestSave}
                  disabled={isPending || !tagName.trim()}
                  className="rounded-full bg-shuffle px-4 py-1 text-base font-bold text-white transition-colors hover:bg-shuffle-deep disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 保存前の確認ダイアログ */}
      <ConfirmDialog
        open={confirmSave}
        message="登録しますか?"
        onConfirm={performSave}
        onCancel={() => setConfirmSave(false)}
        isPending={isPending}
      />

      {/* 削除前の確認ダイアログ */}
      <ConfirmDialog
        open={confirmDelete !== null}
        message={
          confirmDelete
            ? `「${confirmDelete.name}」を削除してよろしいですか?`
            : ""
        }
        onConfirm={performDelete}
        onCancel={() => setConfirmDelete(null)}
        isPending={isPending}
      />
    </main>
  );
}
