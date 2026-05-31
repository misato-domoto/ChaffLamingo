"use client";

/**
 * タグ管理画面 (= "/results")
 * --------------------------------------------------------------------
 * 開発スタブ。詳細な開発手順は app/(main)/layouts/page.tsx の冒頭コメント参照。
 */

import { useState } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export default function ResultsPage() {

  const [activeDialog, setActiveDialog] = useState<"insert" | "update" | "delete" | null>(null)

  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 flex gap-3 text-xl font-bold text-[var(--shuffle)]">
        シャッフル結果一覧
      </h1>
      {/* タグ一覧表示：1段目 */}
      <div className="mb-3 flex flex-wrap items-center gap-6">
        <Card className="relative h-41 w-70"
                onClick={() => setActiveDialog("card")}
          >
            <CardContent className="p-0">
              <div className="absolute bottom-2 left-4 text-[16px] font-bold text-[var(--muted-foreground)]">
                20XX/XX/XX　00:00
              </div>
              <div className="absolute bottom-2 right-3">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            </CardContent>
          </Card>
        <Card className="relative h-41 w-70"
                onClick={() => setActiveDialog("card")}
          >
            <CardContent className="p-0">
              <div className="absolute bottom-2 left-4 text-[16px] font-bold text-[var(--muted-foreground)]">
                20XX/XX/XX　00:00
              </div>
              <div className="absolute bottom-2 right-3">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            </CardContent>
          </Card>
        <Card className="relative h-41 w-70"
                onClick={() => setActiveDialog("card")}
          >
            <CardContent className="p-0">
              <div className="absolute bottom-2 left-4 text-[16px] font-bold text-[var(--muted-foreground)]">
                20XX/XX/XX　00:00
              </div>
              <div className="absolute bottom-2 right-3">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            </CardContent>
          </Card>
      </div>
      {/* タグ一覧表示：2段目 */}
      <div className="mb-3 flex flex-wrap items-center gap-6">
        <Card className="relative h-41 w-70"
                onClick={() => setActiveDialog("card")}
          >
            <CardContent className="p-0">
              <div className="absolute bottom-2 left-4 text-[16px] font-bold text-[var(--muted-foreground)]">
                20XX/XX/XX　00:00
              </div>
              <div className="absolute bottom-2 right-3">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            </CardContent>
          </Card>
       <Card className="relative h-41 w-70"
                onClick={() => setActiveDialog("card")}
          >
            <CardContent className="p-0">
              <div className="absolute bottom-2 left-4 text-[16px] font-bold text-[var(--muted-foreground)]">
                20XX/XX/XX　00:00
              </div>
              <div className="absolute bottom-2 right-3">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            </CardContent>
          </Card>
        <Card className="relative h-41 w-70"
                onClick={() => setActiveDialog("card")}
          >
            <CardContent className="p-0">
              <div className="absolute bottom-2 left-4 text-[16px] font-bold text-[var(--muted-foreground)]">
                20XX/XX/XX　00:00
              </div>
              <div className="absolute bottom-2 right-3">
              <Trash2 className="h-5 w-5 text-[var(--muted-foreground)]" />
            </div>
            </CardContent>
          </Card>
      </div>


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
