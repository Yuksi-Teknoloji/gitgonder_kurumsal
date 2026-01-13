//src/components/credit/CreditChip.tsx
"use client";

import * as React from "react";
import Link from "next/link";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

export default function CreditChip({
  creditBalance,
  onTopUp,
  movementsHref,
}: {
  creditBalance: number;
  onTopUp: () => void;
  movementsHref?: string; // varsa "Kredi Hareketleri" link olur
}) {
  const fmt = React.useMemo(() => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(creditBalance ?? 0);
  }, [creditBalance]);

  return (
    <div className="relative inline-block group">
      {/* Trigger: Resim 1 */}
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-2 h-12 px-6 rounded-xl",
          "border border-neutral-200 bg-white text-sm font-semibold text-neutral-900",
          "hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        )}
        aria-haspopup="menu"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-neutral-50 border border-neutral-200 text-neutral-700">
          💳
        </span>
        <span className="tabular-nums">{fmt}</span>
        <span className="text-neutral-500">▾</span>
      </button>

      {/* Hover/Focus popover: Resim 2 */}
      <div
        className={cn(
          "absolute right-0 mt-2 w-[360px] z-40",
          "opacity-0 scale-95 translate-y-1 pointer-events-none",
          "group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto",
          "group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto",
          "transition duration-150 ease-out"
        )}
      >
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-50 border border-neutral-200">
                💳
              </span>
              Toplam Kredi
            </div>
            <div className="text-xl font-semibold text-neutral-900 tabular-nums">{fmt}</div>
          </div>

          <div className="px-4 pb-4 flex items-center gap-3">
            {movementsHref ? (
              <Link
                href={movementsHref}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg",
                  "border border-indigo-200 bg-white text-indigo-700 text-sm font-semibold",
                  "hover:bg-indigo-50"
                )}
              >
                ▦ Kredi Hareketleri
              </Link>
            ) : (
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg",
                  "border border-indigo-200 bg-white text-indigo-700 text-sm font-semibold",
                  "hover:bg-indigo-50"
                )}
                onClick={() => alert("Mock: Kredi Hareketleri")}
              >
                ▦ Kredi Hareketleri
              </button>
            )}

            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg",
                "bg-indigo-600 text-white text-sm font-semibold",
                "hover:bg-indigo-700"
              )}
              onClick={onTopUp}
            >
              + Kredi Yükle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
