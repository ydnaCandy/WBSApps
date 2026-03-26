import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * TailwindCSSのクラス名を安全にマージ・結合するユーティリティ
 * 例: cn("px-2 py-1", isTrue && "bg-blue-500", "p-4") -> "bg-blue-500 p-4" (p-4がpx-2 py-1を上書き)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
