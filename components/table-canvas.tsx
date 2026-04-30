/**
 * 中央のテーブル可視化（シェル）
 * - 大きな円が「テーブル」、周囲の小さな円が「席」
 * - 今は静的に 4 人想定で描画。後でロジックに合わせて差し替えできるようにする
 */
export function TableCanvas() {
  // 4 席の角度（上 / 右 / 下 / 左）
  const seats = [
    { top: "8%", left: "50%" },
    { top: "50%", left: "82%" },
    { top: "82%", left: "50%" },
    { top: "50%", left: "18%" },
  ];

  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[460px]">
      {/* テーブル本体 */}
      <div className="absolute left-1/2 top-1/2 h-[44%] w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--flamingo-soft)] bg-[var(--flamingo-tint)]" />

      {/* 席 */}
      {seats.map((pos, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--flamingo-soft)] bg-[var(--flamingo-tint)] text-[var(--flamingo-deep)]">
            <SmileFace className="h-6 w-6" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SmileFace({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7 9.5h.01" />
      <path d="M17 9.5h.01" />
      <path d="M8.5 14c.9 1 2.1 1.6 3.5 1.6s2.6-.6 3.5-1.6" />
      <path d="M3.5 12c0-2.3 1.6-3.6 3.6-3.6" />
      <path d="M20.5 12c0-2.3-1.6-3.6-3.6-3.6" />
    </svg>
  );
}
