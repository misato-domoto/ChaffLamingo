import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwindクラスの結合ユーティリティ。
 * shadcn/ui互換のシグネチャ。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
