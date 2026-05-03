"use client";

/**
 * 共通サイドバー
 * --------------------------------------------------------------------
 * - 全画面で共通表示する。app/(main)/layout.tsx から使われる。
 * - アイコンは <Link> でルーティングし、現在のパスから active 判定する
 *   ので、「画面ごとの page.tsx」さえ作ればここに手を加えなくて済む。
 * - 右端の「つまみ (へこみ)」は active リンクの中心 Y にスライドする:
 *   1) 距離に比例した duration (= 見かけの速度を一定に)
 *   2) back-out カーブで慣性風オーバーシュート
 *
 * 仕組み:
 *   <aside>            ← ピンク矩形 + inner-shadow + overflow:hidden
 *     <Image knob>     ← public/ui/knob.png をスライドさせる
 *     <Link>×4         ← 各アイコン (top: 2件, bottom: 2件)
 *   </aside>
 */

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dices, Star, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

type IconProps = { className?: string; strokeWidth?: number };
type IconComponent = React.ComponentType<IconProps>;

type NavItem = {
  href: string;
  label: string;
  Icon: IconComponent;
};

// 上段ナビ (ロゴの下)
const TOP_ITEMS: NavItem[] = [
  { href: "/", label: "クイックシャッフル", Icon: Dices },
  { href: "/favorites", label: "お気に入り", Icon: Star },
];

// 下段ナビ (フッタ寄り)
const BOTTOM_ITEMS: NavItem[] = [
  { href: "/settings", label: "設定", Icon: Settings },
];

const ALL_ITEMS = [...TOP_ITEMS, ...BOTTOM_ITEMS];

// つまみの動きの調整定数。デザイナと相談しながら触る用にここに集約。
const KNOB_SPEED_PX_PER_MS = 0.5;
const KNOB_MIN_DURATION_MS = 150;
const KNOB_MAX_DURATION_MS = 700;

export function Sidebar() {
  const pathname = usePathname();

  // 現在の URL から active な href を決める。
  // 完全一致を優先し、それ以外は前方一致 (例: /favorites/123 → /favorites) で
  // フォールバック、それでも該当が無ければ "/" を active にする。
  const activeHref = useMemo(() => {
    const exact = ALL_ITEMS.find((i) => i.href === pathname);
    if (exact) return exact.href;
    const prefix = ALL_ITEMS.find(
      (i) => i.href !== "/" && pathname.startsWith(i.href),
    );
    return prefix?.href ?? "/";
  }, [pathname]);

  // つまみ位置と duration をまとめて 1 つの state で管理する
  // (= top と transition-duration を同じレンダーで反映するため)。
  const asideRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const prevYRef = useRef<number | null>(null);
  const [knob, setKnob] = useState<{ y: number; duration: number } | null>(
    null,
  );

  useEffect(() => {
    const update = () => {
      const link = linkRefs.current[activeHref];
      const aside = asideRef.current;
      if (!link || !aside) return;
      // <aside> 基準の中心 Y を計算 (offsetTop は親の position に依存して
      // ズレるので getBoundingClientRect を使う)。
      const linkRect = link.getBoundingClientRect();
      const asideRect = aside.getBoundingClientRect();
      const y = linkRect.top - asideRect.top + linkRect.height / 2;

      // 移動距離に比例した duration → 見かけ上の速度が一定になる。
      const prev = prevYRef.current;
      const duration =
        prev === null
          ? 0 // 初回は瞬間配置
          : Math.max(
              KNOB_MIN_DURATION_MS,
              Math.min(
                KNOB_MAX_DURATION_MS,
                Math.abs(y - prev) / KNOB_SPEED_PX_PER_MS,
              ),
            );
      prevYRef.current = y;
      setKnob({ y, duration });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [activeHref]);

  const renderItem = (item: NavItem) => {
    const isActive = activeHref === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        ref={(el) => {
          linkRefs.current[item.href] = el;
        }}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative z-10 grid h-12 w-12 place-items-center rounded-xl transition-colors",
          // active 時はつまみのへこみ上にアイコンが乗るので、視認性のため濃色に
          isActive
            ? "text-[var(--foreground)]"
            : "text-white/85 hover:text-white",
        )}
      >
        <item.Icon className="h-6 w-6" strokeWidth={2.25} />
      </Link>
    );
  };

  return (
    <aside
      ref={asideRef}
      className="relative flex w-20 shrink-0 flex-col items-center overflow-hidden py-6 text-white"
      style={{
        // 全角 R30 / 上下左右 margin 10 / インナーシャドウ X4 Y4 blur20 #000 25%
        borderRadius: 30,
        margin: 10,
        background: "var(--flamingo)",
        boxShadow: "inset 4px 4px 20px rgba(0, 0, 0, 0.25)",
      }}
    >
      {/* つまみ画像 (へこみとして見えるように <aside> の overflow:hidden で
          右半分が切れる前提)。位置は active リンクの中心 Y に追従。 */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute",
          knob === null ? "opacity-0" : "opacity-100",
        )}
        style={{
          top: knob?.y ?? 0,
          right: 0,
          transform: "translateY(-50%)",
          transition: `top ${knob?.duration ?? 0}ms cubic-bezier(0.34, 1.45, 0.64, 1), opacity 0.25s ease-out`,
        }}
      >
        <Image
          src="/ui/knob.png"
          alt=""
          // 画像の実寸は 45x132。アイコン (h-12 w-12 = 48px) と重ならないよう、
          // 表示サイズを縦横比そのままで縮小している。
          // 重なりが気になるならここの数字を更に小さく、
          // 逆につまみが目立たないと感じたら大きくして調整可能。
          width={28}
          height={82}
          priority
        />
      </div>

      {/* ロゴ */}
      <div className="relative z-10 mb-8 grid h-12 w-12 place-items-center rounded-xl bg-white/95 shadow-sm">
        <Image
          src="/next.svg"
          alt="ChaffLamingo"
          width={28}
          height={28}
          className="opacity-80"
        />
      </div>

      {/* 上段ナビ */}
      <nav className="flex flex-col items-center gap-3">
        {TOP_ITEMS.map(renderItem)}
      </nav>

      <div className="flex-1" />

      {/* 下段ナビ */}
      <nav className="flex flex-col items-center gap-6">
        {BOTTOM_ITEMS.map(renderItem)}
      </nav>
    </aside>
  );
}

