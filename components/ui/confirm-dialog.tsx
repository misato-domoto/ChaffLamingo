"use client";

/**
 * 確認ダイアログ (汎用)
 * --------------------------------------------------------------------
 * window.confirm の代わりに使うブランド統一スタイルの確認ダイアログ。
 *
 * 用途:
 *   - 「登録しますか?」(タグ追加・編集 / メンバー登録)
 *   - 「削除しますか?」(タグ削除 / メンバー削除 / レイアウト削除 etc.)
 *   - その他、Server Action 実行前の最終確認
 *
 * 見た目はタグ画面で先に作っていた削除確認ダイアログをベースにしている:
 *   外側: flamingo→shuffle のグラデーション 4px ボーダー
 *   内側: 白背景、shuffle 色の太字メッセージ、丸ボタン2つ
 *
 * 使い方:
 *   const [confirm, setConfirm] = useState(false);
 *   <ConfirmDialog
 *     open={confirm}
 *     message="登録しますか?"
 *     onConfirm={() => { ...save logic...; setConfirm(false); }}
 *     onCancel={() => setConfirm(false)}
 *     isPending={isPending}
 *   />
 */

import { useEffect, useRef } from "react";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  /** 表示するメッセージ (例: "登録しますか?" / 「タグ◯を削除しますか?」) */
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** OK ボタンの文言 (デフォルト "OK") */
  okLabel?: string;
  /** Cancel ボタンの文言 (デフォルト "キャンセル") */
  cancelLabel?: string;
  /** true の間はボタンを無効化 (= Server Action 実行中) */
  isPending?: boolean;
};

export function ConfirmDialog({
  open,
  message,
  onConfirm,
  onCancel,
  okLabel = "OK",
  cancelLabel = "キャンセル",
  isPending = false,
}: Props) {
  // OK ボタンを参照して open 時に自動 focus する。Radix の Dialog が
  // 「最初の focusable 要素」へ自動 focus してしまうため、明示的にここへ。
  const okButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // 開いた直後に OK にフォーカス
    const t = setTimeout(() => okButtonRef.current?.focus(), 0);

    // Enter で OK 押下 (isPending 中は無視)。Esc は Radix Dialog の
    // デフォルト挙動で onOpenChange(false) → onCancel() が走る。
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (!isPending) onConfirm();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isPending, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="w-[min(94vw,400px)] max-w-none border-0 bg-transparent p-0 shadow-none overflow-visible [&>button]:hidden">
        {/* スクリーンリーダー向けタイトル (見た目には出さない) */}
        <VisuallyHidden>
          <DialogTitle>確認</DialogTitle>
        </VisuallyHidden>

        {/* グラデーション枠 (4px) */}
        <div className="rounded-xl bg-gradient-to-br from-[var(--flamingo)] via-[var(--flamingo-soft)] to-[var(--shuffle)] p-[4px]">
          <div className="flex flex-col items-center justify-center gap-8 rounded-xl bg-white p-8">
            <p className="text-center text-[20px] font-bold text-shuffle">
              {message}
            </p>
            <div className="flex gap-6">
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="h-12 w-32 rounded-full border-2 border-shuffle font-bold text-shuffle transition-colors hover:border-[var(--shuffle-deep)] hover:text-[var(--shuffle-deep)] disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                ref={okButtonRef}
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="h-12 w-32 rounded-full bg-shuffle font-bold text-white transition-colors hover:bg-shuffle-deep disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--shuffle-deep)] focus:ring-offset-2"
              >
                {isPending ? "..." : okLabel}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
