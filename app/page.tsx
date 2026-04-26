import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/sidebar";
import { TableCanvas } from "@/components/table-canvas";
import { MemberList } from "@/components/member-list";
import { ShuffleControls } from "@/components/shuffle-controls";

export default function QuickShufflePage() {
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar />

      <main className="flex-1 px-8 py-6">
        {/* ページタイトル */}
        <h1 className="mb-4 text-xl font-bold text-[var(--flamingo)]">
          クイックシャッフル画面
        </h1>

        {/* 上段: 中央キャンバス + 右メンバーリスト */}
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="relative min-h-[420px] py-8">
            <CardContent className="px-8">
              {/* カウンタ */}
              <div className="mb-2 text-base font-bold text-[var(--flamingo)]">
                12 / 13 人
              </div>
              <TableCanvas />
            </CardContent>
          </Card>

          <div className="lg:pt-2">
            <MemberList />
          </div>
        </div>

        {/* 下段: コントロール */}
        <div className="mt-8">
          <ShuffleControls />
        </div>
      </main>
    </div>
  );
}
