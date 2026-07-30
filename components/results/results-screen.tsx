"use client";

/**
 * シャッフル結果一覧 (Client Component)
 * --------------------------------------------------------------------
 * - results: Server から受け取った PNG メタ情報 (filename / path / createdAt)
 * - 各カード: 画像サムネ + 日時表示 + 削除アイコン
 * - カードクリック: 拡大プレビューのダイアログを表示 (画像 + パスコピー)
 * - 削除: ConfirmDialog で確認 → deleteResultImage
 */

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { deleteResultImage } from "@/lib/data";
import type { ResultImage } from "@/lib/types";

type Props = {
  results: ResultImage[];
};

export function ResultsScreen({ results }: Props) {
  const [preview, setPreview] = useState<ResultImage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ResultImage | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopyPath = async (img: ResultImage) => {
    try {
      // クリップボードに公開 URL をコピー (ファイルパスではなく)
      await navigator.clipboard.writeText(
        `${window.location.origin}${img.path}`,
      );
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1500);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  const performDelete = () => {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteResultImage(confirmDelete.filename);
      setConfirmDelete(null);
      // プレビュー中の画像が削除対象なら閉じる
      if (preview?.filename === confirmDelete.filename) {
        setPreview(null);
      }
    });
  };

  // "2026-01-15T03:45:00.000Z" → "2026/01/15 12:45" (ローカル時刻)
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${day}　${hh}:${mm}`;
  };

  return (
    <main className="h-screen sm:px-2 sm:py-6">
      <h1 className="mb-4 flex gap-3 text-xl font-bold text-shuffle">
        シャッフル結果一覧
      </h1>

      {results.length === 0 ? (
        <Card className="p-8">
          <CardContent className="p-0 text-center text-sm text-muted-foreground">
            まだ保存された結果はありません。シャッフル画面で結果を保存すると
            ここに表示されます。
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          {results.map((r) => (
            <Card
              key={r.filename}
              className="relative h-41 w-70 cursor-pointer overflow-hidden transition hover:opacity-90"
              onClick={() => setPreview(r)}
            >
              <CardContent className="p-0">
                {/* サムネ */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.path}
                  alt={r.filename}
                  className="h-full w-full object-cover"
                />
                {/* 日時 */}
                <div className="absolute bottom-2 left-4 rounded bg-white/90 px-2 py-0.5 text-[14px] font-bold text-muted-foreground">
                  {formatDate(r.createdAt)}
                </div>
                {/* 削除ボタン (カードクリックを止めて confirm を開く) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(r);
                  }}
                  aria-label={`${r.filename} を削除`}
                  className="absolute bottom-2 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-muted-foreground hover:bg-white hover:text-flamingo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* プレビューダイアログ (画像 + パスコピー) */}
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className="w-[min(96vw,1000px)] max-w-none border-0 bg-transparent p-0 shadow-none overflow-visible [&>button]:hidden">
          <div className="rounded-xl bg-linear-to-br from-flamingo via-flamingo-soft to-shuffle p-1">
            <div className="rounded-xl bg-white p-6">
              <DialogHeader>
                <DialogTitle className="mb-4 text-center text-xl font-bold text-shuffle">
                  シャッフル結果
                </DialogTitle>
              </DialogHeader>

              {preview && (
                <>
                  <div className="mb-4 text-center text-sm text-muted-foreground">
                    {formatDate(preview.createdAt)}
                  </div>
                  <div className="mx-auto mb-4 max-h-[60vh] overflow-hidden rounded-2xl bg-(--muted-foreground)/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.path}
                      alt={preview.filename}
                      className="mx-auto max-h-[60vh] object-contain"
                    />
                  </div>

                  {/* URL + コピー */}
                  <div className="flex justify-center">
                    <div className="flex h-10 w-full max-w-150 overflow-hidden rounded-full border-2 border-shuffle">
                      <input
                        readOnly
                        value={`${preview.path}`}
                        className="h-full flex-1 rounded-none border-0 bg-white px-4 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyPath(preview)}
                        className="flex h-full w-20 items-center justify-center bg-shuffle text-sm font-bold text-white transition-colors hover:bg-shuffle-deep"
                      >
                        {copyToast ? "✓" : "コピー"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center gap-3">
                    <a
                      href={preview.path}
                      download={preview.filename}
                      className="rounded-full border-2 border-shuffle px-4 py-1 text-sm font-bold text-shuffle hover:bg-shuffle-tint"
                    >
                      画像をダウンロード
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <ConfirmDialog
        open={confirmDelete !== null}
        message="この結果を削除しますか?"
        onConfirm={performDelete}
        onCancel={() => setConfirmDelete(null)}
        isPending={isPending}
      />
    </main>
  );
}
