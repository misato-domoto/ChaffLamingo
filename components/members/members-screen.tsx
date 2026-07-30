"use client";

/**
 * メンバー登録・編集画面 (Client Component)
 * --------------------------------------------------------------------
 * デザイン:
 *   ┌──────────────────────────┐    ┌────────────────┐
 *   │  📷  [姓] [名]            │    │  🔍 検索  🏷️    │
 *   │      [生年月日][性別 ▼]   │    │  □ メンバー氏名 │
 *   │                          │    │  □ ...          │
 *   │  タグ設定 [編集]          │    └────────────────┘
 *   │   ▼ 事業部1               │
 *   │   ▼ 事業部2               │
 *   │   ▼ 事業部3               │
 *   │  [削除]        [登録]    │
 *   └──────────────────────────┘
 *
 * 姓と名は別フィールドで保持し、シャッフル時の「苗字を椅子に」表示は
 * lastName だけを使う。フルネーム表示は getDisplayName(member)。
 */

import { useRef, useState, useTransition } from "react";
import {
  Camera,
  Search,
  Tag as TagIcon,
  X,
  Download,
  Upload,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  deleteMember,
  saveMember,
  uploadMemberPicture,
} from "@/lib/data";
import type { Gender, Member, Tag } from "@/lib/types";
import { GENDER_LABELS, getDisplayName } from "@/lib/types";

type Props = {
  members: Member[];
  tags: Tag[];
};

export function MembersScreen({ members, tags }: Props) {
  // ── 編集対象 ────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── フォーム state ─────────────────────────────────────────────
  const [formLastName, setFormLastName] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formGender, setFormGender] = useState<Gender | "">("");
  const [formPictureUrl, setFormPictureUrl] = useState<string | undefined>();
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const pendingFileRef = useRef<File | null>(null);

  // ── 右リスト ────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());

  // ── ダイアログ ──────────────────────────────────────────────────
  type DialogState = null | "tag-edit" | "tag-filter";
  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── 画像 input ──────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // ── Excel 一括取込 ──────────────────────────────────────────────
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<null | {
    kind: "success";
    added: number;
  } | {
    kind: "error";
    message: string;
    errors?: { row: number; message: string }[];
  }>(null);

  const handleImportFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/members/import", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as
        | {
            added?: number;
            error?: string;
            errors?: { row: number; message: string }[];
          }
        | null;
      if (!res.ok) {
        setImportResult({
          kind: "error",
          message: data?.error ?? `アップロード失敗 (${res.status})`,
          errors: data?.errors,
        });
      } else {
        setImportResult({
          kind: "success",
          added: data?.added ?? 0,
        });
      }
    } catch (err) {
      setImportResult({
        kind: "error",
        message: err instanceof Error ? err.message : "不明なエラー",
      });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  // ── ヘルパ ──────────────────────────────────────────────────────
  const loadMember = (m: Member) => {
    setEditingId(m.id);
    setFormLastName(m.lastName ?? "");
    setFormFirstName(m.firstName ?? "");
    setFormBirthDate(m.birthDate ?? "");
    setFormGender(m.gender ?? "");
    setFormPictureUrl(m.pictureUrl);
    setFormTagIds(m.tagIds);
    pendingFileRef.current = null;
  };
  const startNew = () => {
    setEditingId(null);
    setFormLastName("");
    setFormFirstName("");
    setFormBirthDate("");
    setFormGender("");
    setFormPictureUrl(undefined);
    setFormTagIds([]);
    pendingFileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFileRef.current = file;
    setFormPictureUrl(URL.createObjectURL(file));
  };

  // ── アクション ──────────────────────────────────────────────────
  const requestSave = () => {
    if (!formLastName.trim() && !formFirstName.trim()) {
      alert("姓または名を入力してください");
      return;
    }
    setConfirmSave(true);
  };

  const performSave = () => {
    startTransition(async () => {
      const isBlobPreview = formPictureUrl?.startsWith("blob:") ?? false;
      const saved = await saveMember({
        id: editingId ?? undefined,
        lastName: formLastName.trim(),
        firstName: formFirstName.trim(),
        birthDate: formBirthDate || undefined,
        gender: (formGender || undefined) as Gender | undefined,
        pictureUrl: isBlobPreview ? undefined : formPictureUrl,
        tagIds: formTagIds,
      });

      const file = pendingFileRef.current;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const url = await uploadMemberPicture(saved.id, fd);
        await saveMember({ ...saved, pictureUrl: url });
        pendingFileRef.current = null;
        setFormPictureUrl(url);
      }

      setEditingId(saved.id);
      setConfirmSave(false);
    });
  };

  const requestDelete = () => {
    if (!editingId) return;
    setConfirmDelete(true);
  };

  const performDelete = () => {
    if (!editingId) return;
    startTransition(async () => {
      await deleteMember(editingId);
      setConfirmDelete(false);
      startNew();
    });
  };

  // ── 右リストのフィルタ ──────────────────────────────────────────
  const filteredMembers = members.filter((m) => {
    const fullName = getDisplayName(m).toLowerCase();
    const matchSearch = fullName.includes(search.trim().toLowerCase());
    const matchTag =
      filterTagIds.size === 0 ||
      m.tagIds.some((tid) => filterTagIds.has(tid));
    return matchSearch && matchTag;
  });

  // ── タグ操作 ────────────────────────────────────────────────────
  const toggleFormTag = (tagId: string) => {
    setFormTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId],
    );
  };
  const toggleFilterTag = (tagId: string) => {
    setFilterTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  return (
    <main className="h-screen overflow-hidden sm:px-2 sm:py-6">
      <h1 className="mb-4 text-xl font-bold text-shuffle">
        メンバー登録・編集
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* ──────── 左: 編集フォーム (新デザイン) ──────── */}
        <Card className="h-[calc(100vh-90px)] py-4">
          <CardContent className="flex h-full flex-col px-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-4">
                {/* 写真 (大きな丸 + Camera) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="プロフィール画像を選択"
                  className="grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-full bg-shuffle-tint text-shuffle transition-colors hover:bg-shuffle-soft"
                >
                  {formPictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formPictureUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-12 w-12" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onPictureSelect}
                  className="hidden"
                />

                {/* 入力フィールド */}
                <div className="flex flex-col gap-4">
                  {/* 姓 + 名を別々のテキストボックスで */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      placeholder="姓"
                      className="w-32 rounded-sm bg-shuffle-tint px-4 py-1 text-shuffle placeholder:text-shuffle/50"
                    />
                    <input
                      type="text"
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      placeholder="名"
                      className="w-32 rounded-sm bg-shuffle-tint px-4 py-1 text-shuffle placeholder:text-shuffle/50"
                    />
                  </div>
                  {/* 生年月日 + 性別 */}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={formBirthDate}
                      onChange={(e) => setFormBirthDate(e.target.value)}
                      className="w-48 rounded-sm bg-shuffle-tint px-4 py-1 text-shuffle"
                    />
                    <select
                      value={formGender}
                      onChange={(e) =>
                        setFormGender(e.target.value as Gender | "")
                      }
                      className="rounded-sm bg-shuffle-tint px-3 py-1 text-shuffle"
                    >
                      <option value="" disabled>
                        性別
                      </option>
                      {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                        <option key={g} value={g}>
                          {GENDER_LABELS[g]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* タグ設定 (現在の選択を dropdown 風に並べる + 編集ボタン) */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="font-bold">タグ設定</h2>
                <button
                  type="button"
                  onClick={() => setDialog("tag-edit")}
                  className="rounded-sm border border-shuffle bg-white px-2 py-1 text-sm font-bold text-shuffle hover:bg-shuffle-tint"
                >
                  編集
                </button>
              </div>

              {/* 設定済みタグ。1枠 = 1タグ で並べる (デザイン準拠) */}
              <div className="space-y-2">
                {formTagIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    タグが未設定です (編集から追加)
                  </p>
                ) : (
                  formTagIds.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <div
                        key={tagId}
                        className="flex w-fit items-center gap-2 rounded-sm bg-shuffle-tint px-3 py-1 text-sm text-shuffle"
                      >
                        <span>{tag.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleFormTag(tagId)}
                          aria-label={`${tag.name} を外す`}
                          className="text-muted-foreground hover:text-flamingo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 削除 / 登録 */}
            <div className="mt-auto flex justify-between pt-6">
              <button
                type="button"
                onClick={requestDelete}
                disabled={!editingId || isPending}
                className="rounded-full bg-flamingo px-4 py-1 text-base font-bold text-white transition-colors hover:bg-flamingo-deep disabled:cursor-not-allowed disabled:opacity-30"
              >
                削除
              </button>
              <button
                type="button"
                onClick={requestSave}
                disabled={
                  isPending ||
                  (!formLastName.trim() && !formFirstName.trim())
                }
                className="rounded-full bg-shuffle px-4 py-1 text-base font-bold text-white transition-colors hover:bg-shuffle-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "保存中..." : "登録"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ──────── 右: メンバー一覧 ──────── */}
        <Card className="h-[calc(100vh-90px)] p-4">
          <CardContent className="p-0">
            <div className="mb-3 flex items-center gap-2">
              <label className="flex h-10 flex-1 items-center gap-2 rounded-full border border-shuffle-soft bg-white px-3 text-sm text-muted-foreground">
                <Search className="h-4 w-4 text-shuffle-soft" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="メンバーを検索"
                  className="w-full bg-transparent text-foreground outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setDialog("tag-filter")}
                aria-label="タグで絞り込み"
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-shuffle-soft transition-colors ${
                  filterTagIds.size > 0
                    ? "bg-shuffle text-white"
                    : "bg-white text-shuffle hover:bg-shuffle-tint"
                }`}
              >
                <TagIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startNew}
                className="inline-flex items-center rounded-full bg-shuffle px-3 py-1 text-xs font-bold text-white hover:bg-shuffle-deep"
              >
                + 新規メンバー
              </button>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
              {/* Excel テンプレート DL */}
              <a
                href="/api/members/template"
                download
                className="inline-flex items-center gap-1 rounded-full border border-shuffle bg-white px-3 py-1 text-xs font-bold text-shuffle hover:bg-shuffle-tint"
                title="Excel テンプレートをダウンロード"
              >
                <Download className="h-3 w-3" />
                テンプレ
              </a>
              {/* Excel 一括取込 */}
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting}
                className="inline-flex items-center gap-1 rounded-full border border-shuffle bg-white px-3 py-1 text-xs font-bold text-shuffle hover:bg-shuffle-tint disabled:opacity-50"
                title="Excel で一括登録"
              >
                <Upload className="h-3 w-3" />
                {isImporting ? "取込中..." : "一括取込"}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            <ul className="flex max-h-[calc(100vh-250px)] flex-col gap-1 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <li className="px-2 py-3 text-sm text-muted-foreground">
                  {members.length === 0
                    ? "まだメンバーが登録されていません"
                    : "該当するメンバーがいません"}
                </li>
              ) : (
                filteredMembers.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => loadMember(m)}
                      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-shuffle-tint ${
                        editingId === m.id
                          ? "bg-shuffle-tint"
                          : ""
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${
                          editingId === m.id
                            ? "border-shuffle bg-shuffle"
                            : "border-shuffle-soft"
                        }`}
                        aria-hidden
                      >
                        {editingId === m.id && (
                          <span className="block h-2 w-2 rounded-sm bg-white" />
                        )}
                      </span>
                      <span className="text-sm">{getDisplayName(m) || "(名無し)"}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ──────── タグ選択ダイアログ (フォーム用) ──────── */}
      <Dialog
        open={dialog === "tag-edit"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="w-[min(96vw,600px)] max-w-none border-0 bg-transparent p-0 shadow-none overflow-visible [&>button]:hidden">
          <div className="rounded-xl bg-linear-to-br from-flamingo via-flamingo-soft to-shuffle p-1">
            <div className="rounded-xl bg-white px-6 py-4">
              <DialogHeader>
                <DialogTitle className="mb-5 text-center text-xl font-bold text-shuffle">
                  タグを選択
                </DialogTitle>
              </DialogHeader>
              <ul className="max-h-75 overflow-y-auto rounded-md border border-shuffle-soft bg-shuffle-tint/40 p-2">
                {tags.length === 0 ? (
                  <li className="px-2 py-3 text-sm text-muted-foreground">
                    タグがまだ登録されていません (/tags で追加してください)
                  </li>
                ) : (
                  tags.map((tag) => (
                    <li
                      key={tag.id}
                      className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={formTagIds.includes(tag.id)}
                        onChange={() => toggleFormTag(tag.id)}
                        className="h-4 w-4 accent-shuffle"
                      />
                      <span className="text-sm">{tag.name}</span>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="rounded-full bg-shuffle px-4 py-1 text-base font-bold text-white hover:bg-shuffle-deep"
                >
                  決定
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────── タグ絞り込みダイアログ (右リスト用) ──────── */}
      <Dialog
        open={dialog === "tag-filter"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="w-[min(96vw,600px)] max-w-none border-0 bg-transparent p-0 shadow-none overflow-visible [&>button]:hidden">
          <div className="rounded-xl bg-linear-to-br from-flamingo via-flamingo-soft to-shuffle p-1">
            <div className="rounded-xl bg-white px-6 py-4">
              <DialogHeader>
                <DialogTitle className="mb-5 text-center text-xl font-bold text-shuffle">
                  タグで絞り込み
                </DialogTitle>
              </DialogHeader>
              <ul className="max-h-75 overflow-y-auto rounded-md border border-shuffle-soft bg-shuffle-tint/40 p-2">
                {tags.length === 0 ? (
                  <li className="px-2 py-3 text-sm text-muted-foreground">
                    タグがまだ登録されていません
                  </li>
                ) : (
                  tags.map((tag) => (
                    <li
                      key={tag.id}
                      className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={filterTagIds.has(tag.id)}
                        onChange={() => toggleFilterTag(tag.id)}
                        className="h-4 w-4 accent-shuffle"
                      />
                      <span className="text-sm">{tag.name}</span>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setFilterTagIds(new Set())}
                  className="rounded-full border border-shuffle px-4 py-1 text-base font-bold text-shuffle hover:bg-shuffle-tint"
                >
                  クリア
                </button>
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="rounded-full bg-shuffle px-4 py-1 text-base font-bold text-white hover:bg-shuffle-deep"
                >
                  決定
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────── 登録 / 削除 確認 ──────── */}
      <ConfirmDialog
        open={confirmSave}
        message="登録しますか?"
        onConfirm={performSave}
        onCancel={() => setConfirmSave(false)}
        isPending={isPending}
      />
      <ConfirmDialog
        open={confirmDelete}
        message="削除しますか?"
        onConfirm={performDelete}
        onCancel={() => setConfirmDelete(false)}
        isPending={isPending}
      />

      {/* ──────── Excel 一括取込の結果ダイアログ ──────── */}
      <Dialog
        open={importResult !== null}
        onOpenChange={(open) => !open && setImportResult(null)}
      >
        <DialogContent className="w-[min(96vw,600px)] max-w-none border-0 bg-transparent p-0 shadow-none overflow-visible [&>button]:hidden">
          <div className="rounded-xl bg-linear-to-br from-flamingo via-flamingo-soft to-shuffle p-1">
            <div className="rounded-xl bg-white px-6 py-5">
              <DialogHeader>
                <DialogTitle className="mb-3 text-center text-xl font-bold text-shuffle">
                  {importResult?.kind === "success" ? "取込完了" : "取込エラー"}
                </DialogTitle>
              </DialogHeader>

              {importResult?.kind === "success" && (
                <p className="text-center text-base font-bold text-shuffle">
                  {importResult.added} 件のメンバーを登録しました。
                </p>
              )}

              {importResult?.kind === "error" && (
                <div>
                  <p className="text-center text-base font-bold text-flamingo">
                    {importResult.message}
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <ul className="mt-4 max-h-65 overflow-y-auto rounded-md border border-flamingo-soft bg-(--flamingo-tint)/40 p-3 text-sm">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>
                          <span className="font-bold">{err.row} 行目:</span>{" "}
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setImportResult(null)}
                  className="rounded-full bg-shuffle px-4 py-1 text-base font-bold text-white hover:bg-shuffle-deep"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}