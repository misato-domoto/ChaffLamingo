import { Minus, Plus, ArrowLeft, ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * 1テーブルあたりの人数 / テーブル選択 / クイックシャッフルボタン
 * シェルなので状態は持たない
 */
export function ShuffleControls() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* 1テーブルあたりの人数 */}
      <div className="flex flex-col gap-2">
        <span className="px-1 text-xs font-semibold text-[var(--flamingo)]">
          1テーブルあたりの人数
        </span>
        <Card className="gap-0 py-3">
          <CardContent className="flex items-center justify-between gap-4 px-4">
            <RoundIconButton ariaLabel="減らす">
              <Minus className="h-4 w-4" />
            </RoundIconButton>
            <span className="text-2xl font-bold text-[var(--flamingo)] tabular-nums">
              4<span className="ml-0.5 text-base font-semibold">人</span>
            </span>
            <RoundIconButton ariaLabel="増やす">
              <Plus className="h-4 w-4" />
            </RoundIconButton>
          </CardContent>
        </Card>
      </div>

      {/* テーブル選択 */}
      <div className="flex flex-col gap-2">
        <span className="px-1 text-xs font-semibold text-[var(--flamingo)]">
          テーブル選択
        </span>
        <Card className="gap-0 py-3">
          <CardContent className="flex items-center justify-between gap-4 px-4">
            <RoundIconButton ariaLabel="前のテーブル">
              <ArrowLeft className="h-4 w-4" />
            </RoundIconButton>
            <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--flamingo-soft)] bg-[var(--flamingo-tint)]" />
            <RoundIconButton ariaLabel="次のテーブル">
              <ArrowRight className="h-4 w-4" />
            </RoundIconButton>
          </CardContent>
        </Card>
      </div>

      {/* クイックシャッフル */}
      <button
        type="button"
        className="ml-auto grid h-32 w-32 place-items-center rounded-full bg-[var(--flamingo)] text-center text-base font-bold leading-tight text-white shadow-lg shadow-[var(--flamingo)]/30 transition-colors hover:bg-[var(--flamingo-deep)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--flamingo)]/30"
      >
        クイック
        <br />
        シャッフル
      </button>
    </div>
  );
}

function RoundIconButton({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--flamingo-soft)] text-[var(--flamingo)] transition-colors hover:bg-[var(--flamingo-tint)]"
    >
      {children}
    </button>
  );
}
