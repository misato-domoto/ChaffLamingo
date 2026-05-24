"use client";

/**
 * タグ管理画面 (= "/tags")
 * --------------------------------------------------------------------
 * 開発スタブ。詳細な開発手順は app/(main)/layouts/page.tsx の冒頭コメント参照。
 */

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Textarea } from "@/components/ui/textarea"

export default function TagsPage() {

  const [activeDialog, setActiveDialog] = useState<"edit" | "delete" | null>(null)

  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 flex gap-3 text-xl font-bold text-[var(--shuffle)]">
        タグ一覧
      <button
        type="button"
        className="ml-auto px-4 py-1 items-center rounded-full bg-[var(--shuffle)] text-center text-base font-bold text-white transition-colors hover:bg-[var(--shuffle-deep)] "
        onClick={() => setActiveDialog("edit")}
      >
        タグ追加
      </button>
      </h1>
      {/* タグ一覧表示：1段目 */}
      <div className="mb-3 flex flex-wrap items-center gap-6">
        <Card className="relative h-41 w-85 rounded-none [clip-path:polygon(0_0,80%_0,100%_50%,80%_100%,0_100%)]">
          <CardContent className="p-0">
            <div className="absolute top-2 right-20">
              <Pencil className="h-5 w-5 text-[var(--muted-foreground)]"
                onClick={() => setActiveDialog("edit")}
              />
            </div>
            <div className="absolute left-4 text-[16px] font-bold text-[var(--shuffle)]">
              システムインテグレーション事業部
            </div>
            <div className="absolute bottom-2 right-20">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" 
                onClick={() => setActiveDialog("delete")}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="relative h-41 w-85 rounded-none [clip-path:polygon(0_0,80%_0,100%_50%,80%_100%,0_100%)]">
          <CardContent className="p-0">
            <div className="absolute top-2 right-20">
              <Pencil className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            <div className="absolute left-4 text-[16px] font-bold text-[var(--shuffle)]">
              新規事業部
            </div>
            <div className="absolute bottom-2 right-20">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative h-41 w-85 rounded-none [clip-path:polygon(0_0,80%_0,100%_50%,80%_100%,0_100%)]">
          <CardContent className="p-0">
            <div className="absolute top-2 right-20">
              <Pencil className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            <div className="absolute left-4 text-[16px] font-bold text-[var(--shuffle)]">
              Mobility事業部
            </div>
            <div className="absolute bottom-2 right-20">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* タグ一覧表示：2段目 */}
      <div className="mb-3 flex flex-wrap items-center gap-6">
        <Card className="relative h-41 w-85 rounded-none [clip-path:polygon(0_0,80%_0,100%_50%,80%_100%,0_100%)]">
          <CardContent className="p-0">
            <div className="absolute top-2 right-20">
              <Pencil className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            <div className="absolute left-4 text-[16px] font-bold text-[var(--shuffle)]">
              管理部
            </div>
            <div className="absolute bottom-2 right-20">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative h-41 w-85 rounded-none [clip-path:polygon(0_0,80%_0,100%_50%,80%_100%,0_100%)]">
          <CardContent className="p-0">
            <div className="absolute top-2 right-20">
              <Pencil className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            <div className="absolute left-4 text-[16px] font-bold text-[var(--shuffle)]">
              チーム長
            </div>
            <div className="absolute bottom-2 right-20">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative h-41 w-85 rounded-none [clip-path:polygon(0_0,80%_0,100%_50%,80%_100%,0_100%)]">
          <CardContent className="p-0">
            <div className="absolute top-2 right-20">
              <Pencil className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            <div className="absolute left-4 text-[16px] font-bold text-[var(--shuffle)]">
              2026年度入社メンバー
            </div>
            <div className="absolute bottom-2 right-20">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* タグ編集ダイアログ */}
      <Dialog 
        open={activeDialog === "edit"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className="w-150 h-50 max-w-none max-h-none sm:max-w-none p-0 border-0 bg-transparent shadow-none overflow-visible [&>button]:hidden">
          {/* グラデーション枠 */}
          <div className="h-full w-full rounded-xl bg-gradient-to-br from-[var(--flamingo)] via-[var(--flamingo-soft)] to-[var(--shuffle)] p-[4px]">
            <div className="h-full w-full rounded-xl bg-white px-6 py-4">
              <DialogHeader>
                <DialogTitle className="mb-5 text-center text-xl font-bold text-[var(--shuffle)]">
                  タグ編集
                </DialogTitle>
              </DialogHeader>
              <Textarea className="text-center font-bold text-[var(--shuffle)]"/>
              {/* 保存ボタン */}
              <div className="flex justify-center">
                <button
                  className="mt-5 px-4 py-1 items-center rounded-full bg-[var(--shuffle)] text-center text-base font-bold text-white transition-colors hover:bg-[var(--shuffle-deep)] "
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog 
        open={activeDialog === "delete"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
          <DialogContent className="w-100 h-50 max-w-none max-h-none sm:max-w-none p-0 border-0 bg-transparent shadow-none overflow-visible [&>button]:hidden">
            <VisuallyHidden>
              <DialogTitle>削除確認ダイアログ</DialogTitle>
            </VisuallyHidden>
            {/* グラデーション枠 */}
            <div className="h-full w-full rounded-xl bg-gradient-to-br from-[var(--flamingo)] via-[var(--flamingo-soft)] to-[var(--shuffle)] p-[4px]">
              <div className="h-full w-full rounded-xl bg-white p-8 flex flex-col items-center justify-center gap-8">
                <p className="text-[20px] font-bold text-[var(--shuffle)] text-center">
                  削除してよろしいですか？
                </p>
                <div className="flex gap-6">
                  <button className="h-12 w-32 rounded-full text-[var(--shuffle)] font-bold border-2 border-[var(--shuffle)] hover:text-[var(--shuffle-deep)] hover:border-[var(--shuffle-deep)]">
                    キャンセル
                  </button>
                  <button className="h-12 w-32 rounded-full bg-[var(--shuffle)] text-white font-bold hover:bg-[var(--shuffle-deep)]">
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
