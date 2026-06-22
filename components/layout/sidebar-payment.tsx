"use client";

/**
 * 支払い(プラン案内)モーダル
 * --------------------------------------------------------------------
 * sidebar.tsx のロゴ押下で表示する、Canva の有料プラン誘導モーダルを
 * 模した UI。プラン選択カード + 機能比較表 + 無料トライアル CTA という
 * 構成はそのまま流用し、配色だけ本アプリの flamingo テーマに合わせている。
 *
 * sidebar.tsx 側から `import { PaymentModal } from "./sidebar-payment"`
 * で読み込んで使う想定。layout.tsx 側の変更は不要。
 */

import { useState } from "react";
import { X, Check, Crown } from "lucide-react";

import { cn } from "@/lib/utils";

type PlanId = "standard" | "premium";

type PlanFeature = {
  label: string;
  standard: string | boolean;
  premium: string | boolean;
};

const PLAN_FEATURES: PlanFeature[] = [
  { label: "メンバー登録数", standard: "50人", premium: "無制限" },
  { label: "テーブルパターン保存", standard: "3個", premium: "無制限" },
  { label: "チーム共有メンバー", standard: "1人", premium: "10人" },
  { label: "画像で書き出し・共有", standard: true, premium: true },
  { label: "AIおまかせシャッフル", standard: false, premium: true },
  { label: "優先サポート", standard: false, premium: true },
];

function FeatureCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-4 w-4 text-[var(--flamingo)]" />
    ) : (
      <span className="text-black/55">−</span>
    );
  }
  return <span>{value}</span>;
}

export function PaymentModal({ onClose }: { onClose: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("premium");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-7 rainbow-border"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-black/10 text-foreground transition-colors hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </button>

        <h2
          id="payment-modal-title"
          className="mb-1 text-lg font-medium text-foreground"
        >
          <span style={{ color: "var(--flamingo)" }}>プレミアムプラン</span>
          を無料でお試しください
        </h2>
        <p className="mb-5 text-sm text-black/55">
          ぴったりなプランをお選びください。いつでも解約可能です。
        </p>

        <div className="mb-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedPlan("standard")}
            className={cn(
              "flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors",
              selectedPlan === "standard"
                ? "border-[var(--flamingo)] bg-[var(--flamingo)]/5"
                : "border-black/10",
            )}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-full border",
                  selectedPlan === "standard"
                    ? "border-[var(--flamingo)]"
                    : "border-black/30",
                )}
              >
                {selectedPlan === "standard" && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--flamingo)" }}
                  />
                )}
              </span>
              <span className="text-sm font-medium text-foreground">
                スタンダード
              </span>
            </span>
            <span className="text-xs text-black/55">
              30日間は¥0、その後は¥680/月
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan("premium")}
            className={cn(
              "flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors",
              selectedPlan === "premium"
                ? "border-[var(--flamingo)] bg-[var(--flamingo)]/5"
                : "border-black/10",
            )}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-full border",
                  selectedPlan === "premium"
                    ? "border-[var(--flamingo)]"
                    : "border-black/30",
                )}
              >
                {selectedPlan === "premium" && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--flamingo)" }}
                  />
                )}
              </span>
              <span className="text-sm font-medium text-foreground">
                プレミアム
              </span>
            </span>
            <span className="text-xs text-black/55">
              30日間は¥0、その後は¥1,280/月
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--flamingo)" }}
        >
          <Crown className="h-4 w-4" />
          30日間無料で試す
        </button>
        <p className="mb-5 text-center text-[11px] text-black/55">
          体験期間終了前にご登録のメールアドレスへお知らせします。
          いつでも簡単に解約できます。
        </p>

        <div className="border-t border-black/10 pt-4">
          <table className="w-full table-fixed text-left text-[13px]">
            <thead>
              <tr className="text-black/55">
                <th className="w-1/2 py-1.5 font-normal" />
                <th className="w-1/4 py-1.5 text-center font-normal">
                  スタンダード
                </th>
                <th
                  className="w-1/4 py-1.5 text-center font-medium"
                  style={{ color: "var(--flamingo)" }}
                >
                  プレミアム
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_FEATURES.map((feature) => (
                <tr key={feature.label} className="border-t border-black/10">
                  <td className="py-2 text-foreground">{feature.label}</td>
                  <td className="py-2 text-center text-foreground">
                    <FeatureCell value={feature.standard} />
                  </td>
                  <td className="py-2 text-center font-medium text-foreground">
                    <FeatureCell value={feature.premium} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
