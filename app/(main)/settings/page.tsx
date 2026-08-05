"use client";

/**
 * 設定画面 (= "/settings")
 * --------------------------------------------------------------------
 * 開発スタブ。詳細な開発手順は app/(main)/favorites/page.tsx の冒頭コメント参照。
 */

import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [openEmailDialog, setOpenEmailDialog] = useState(false);

  return (
    <main className="px-8 py-6">
      <h1 className="mb-4 text-xl font-bold text-flamingo">設定</h1>

      {/* TODO: テーマ切替、通知設定、アカウント連携、エクスポートなど。
          プレゼンテーション部品は components/settings/ に作成する想定。 */}
      <Card>
        <CardContent className="p-8 space-y-3">

          {/* メールアドレス変更 */}
          <Dialog
            open={openEmailDialog}
            onOpenChange={setOpenEmailDialog}
          >
            <DialogTrigger asChild>
              <button className="text-left hover:text-flamingo">
                メールアドレス変更
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  メールアドレス変更
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="新しいメールアドレスを入力してください"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="確認のため、もう一度メールアドレスを入力してください"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="text-center">
                <Button
                  className="bg-flamingo text-white px-4"
                  onClick={() => {
                    setOpenEmailDialog(false);
                  }}
                >
                  変更
                </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* パスワード変更 */}
          <div className="hover:text-flamingo">
            <a href="/set-pwd">パスワード変更</a>
          </div>

          {/* TODO: 課金状況確認 */}
          <div className="hover:text-flamingo">課金状況確認</div>

          {/* ログアウト */}
          <div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-left hover:text-flamingo">ログアウト</button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-flamingo bg-white">キャンセル</AlertDialogCancel>
                  <AlertDialogAction asChild className="bg-flamingo text-white">
                    <Link href="/login">ログアウト</Link>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* 退会 */}
          <div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-left hover:text-flamingo">退会</button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>本当に退会しますか？</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-flamingo bg-white">キャンセル</AlertDialogCancel>
                  <AlertDialogAction asChild className="bg-flamingo text-white">
                    <Link href="/signup">退会</Link>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

        </CardContent>
      </Card>
    </main>
  );
}
