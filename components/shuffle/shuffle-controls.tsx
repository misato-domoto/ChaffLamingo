"use client";

/**
 * シャッフル操作パネル
 * --------------------------------------------------------------------
 * - "1テーブルあたりの人数" (perTable)
 * - "テーブル数" (tableCount): 何卓に分けるかを選ぶ
 * - "クイックシャッフル" ボタン: 上記に基づいて分配を実行
 *
 * 状態は親が持ち、ここは表示と onChange の通知のみ (controlled)。
 */

import { Minus, Plus, ArrowLeft, ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Props = {
  /** 1テーブルあたりの人数。 */
  perTable: number;
  onPerTableChange: (next: number) => void;

  /** テーブルの本数。 */
  tableCount: number;
  onTableCountChange: (next: number) => void;

  /** クイックシャッフル ボタン押下時に呼ばれる。 */
  onShuffle: () => void;
  /** false ならボタンを無効化 (= 選択 0 人など)。 */
  canShuffle: boolean;
};

export function ShuffleControls({
  perTable,
  onPerTableChange,
  tableCount,
  onTableCountChange,
  onShuffle,
  canShuffle,
}: Props) {
  // それぞれ 1 以上にクランプしておく
  const incPer = () => onPerTableChange(perTable + 1);
  const decPer = () => onPerTableChange(Math.max(1, perTable - 1));
  const incTbl = () => onTableCountChange(tableCount + 1);
  const decTbl = () => onTableCountChange(Math.max(1, tableCount - 1));

  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* 1テーブルあたりの人数 */}
      <div className="flex flex-col gap-2">
        <span className="mb-0 text-base font-semibold text-flamingo">
          1テーブルあたりの人数
        </span>
        <Card className="gap-0 py-3">
          <CardContent className="flex items-center justify-between gap-4 px-4">
            <RoundIconButton onClick={decPer} ariaLabel="人数を減らす">
              <Minus className="h-4 w-4" />
            </RoundIconButton>
            <span className="text-2xl font-bold text-flamingo tabular-nums">
              {perTable}
              <span className="ml-0.5 text-base font-semibold">人</span>
            </span>
            <RoundIconButton onClick={incPer} ariaLabel="人数を増やす">
              <Plus className="h-4 w-4" />
            </RoundIconButton>
          </CardContent>
        </Card>
      </div>

      {/* テーブル数 (= 何卓に分けるか) */}
      <div className="flex flex-col gap-2">
        <span className="mb-0 text-base font-semibold text-flamingo">
          テーブル数
        </span>
        <Card className="gap-0 py-3">
          <CardContent className="flex items-center justify-between gap-4 px-4">
            <RoundIconButton
              onClick={decTbl}
              ariaLabel="テーブル数を減らす"
              disabled={tableCount <= 1}
            >
              <ArrowLeft className="h-4 w-4" />
            </RoundIconButton>
            <span className="grid h-9 min-w-9 place-items-center rounded-full border-2 border-flamingo-soft bg-flamingo-tint px-2 text-sm font-bold text-flamingo-deep tabular-nums">
              {tableCount}
            </span>
            <RoundIconButton onClick={incTbl} ariaLabel="テーブル数を増やす">
              <ArrowRight className="h-4 w-4" />
            </RoundIconButton>
          </CardContent>
        </Card>
      </div>

      {/* メインアクション */}
      <button
        type="button"
        onClick={onShuffle}
        disabled={!canShuffle}
        className="mt-1 ml-auto grid h-28 w-28 place-items-center rounded-full bg-flamingo text-center text-base font-bold leading-tight text-white shadow-lg shadow-(--flamingo)/30 transition-colors hover:bg-flamingo-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--flamingo)/30 disabled:cursor-not-allowed disabled:bg-flamingo-soft disabled:shadow-none"
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
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-full border-2 border-flamingo-soft text-flamingo transition-colors hover:bg-flamingo-tint disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
