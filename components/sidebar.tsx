import Image from "next/image";
import { Dices, Star, Settings, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
};

const items: NavItem[] = [
  { key: "shuffle", icon: Dices, label: "クイックシャッフル", active: true },
  { key: "favorites", icon: Star, label: "お気に入り" },
];

export function Sidebar() {
  return (
    <aside className="relative flex w-20 shrink-0 flex-col items-center rounded-r-[2.5rem] bg-[var(--flamingo)] py-6 text-white shadow-[0_8px_24px_-12px_rgba(232,68,125,0.6)]">
      {/* Logo */}
      <div className="mb-8 grid h-12 w-12 place-items-center rounded-xl bg-white/95 shadow-sm">
        <Image
          src="/next.svg"
          alt="ChaffLamingo"
          width={28}
          height={28}
          className="opacity-80"
        />
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col items-center gap-3">
        {items.map(({ key, icon: Icon, label, active }) => (
          <button
            key={key}
            type="button"
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "grid h-12 w-12 place-items-center rounded-xl transition-colors",
              active
                ? "bg-white/15 text-white shadow-inner"
                : "text-white/85 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={2.25} />
          </button>
        ))}
      </nav>

      {/* Settings (bottom) */}
      <button
        type="button"
        aria-label="設定"
        className="grid h-12 w-12 place-items-center rounded-xl text-white/85 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Settings className="h-6 w-6" strokeWidth={2.25} />
      </button>
    </aside>
  );
}
