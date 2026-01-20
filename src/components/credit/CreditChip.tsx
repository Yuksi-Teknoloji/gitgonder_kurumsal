//src/components/credit/CreditChip.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";
import { on } from "events";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

/* ================= Helpers ================= */

async function readJson<T = any>(res: Response): Promise<T> {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : (null as any);
  } catch {
    return t as any;
  }
}

function pickMsg(d: any, fb: string) {
  return d?.error?.message || d?.message || d?.detail || d?.title || d?.otoErrorMessage || fb;
}

function getBearerToken() {
  try {
    return getAuthToken() || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token") || "";
  } catch {
    return getAuthToken() || "";
  }
}

type AccountInfoRes = {
  name?: string;
  email?: string;
  mobileNumber?: string;
  packageName?: string;
  remainingCredit?: number; // ✅ cüzdan
  remainingFreeShipments?: number;
  [k: string]: any;
};

export default function CreditChip({
  onTopUp,
  movementsHref,
  onBalanceChange,
}: {
  onTopUp: (opts?: { refreshCredit?: () => void }) => void; // ✅ refresh callback geçeceğiz
  movementsHref?: string;
  onBalanceChange?: (balance: number) => void; // ✅ bakiye değişim callback
}) {
  const router = useRouter();

  const [creditBalance, setCreditBalance] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const fetchCredit = React.useCallback(async () => {
    setErr(null);
    setLoading(true);

    const bearer = getBearerToken();
    if (!bearer) {
      setLoading(false);
      router.replace("/");
      return;
    }

    try {
      const res = await fetch(`/yuksi/oto/account/info`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${bearer}`,
        },
      });

      const json = await readJson<AccountInfoRes>(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      const rc = Number(json?.remainingCredit ?? 0);
      const bal = Number.isFinite(rc) ? rc : 0;
      setCreditBalance(Number.isFinite(rc) ? rc : 0);
      setCreditBalance(bal);
      onBalanceChange?.(bal);
    } catch (e: any) {
      setErr(e?.message || "Kredi bilgisi alınamadı.");
      setCreditBalance(0);
      onBalanceChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ilk render’da çek
  React.useEffect(() => {
    fetchCredit();
  }, [fetchCredit]);

  const fmt = React.useMemo(() => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(creditBalance ?? 0);
  }, [creditBalance]);

  return (
    <div className="relative inline-block group">
      {/* Trigger */}
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-2 h-12 px-6 rounded-xl",
          "border border-neutral-200 bg-white text-sm font-semibold text-neutral-900",
          "hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        )}
        aria-haspopup="menu"
        title={err ? err : ""}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-neutral-50 border border-neutral-200 text-neutral-700">
          💳
        </span>

        <span className="tabular-nums">{loading ? "Yükleniyor…" : fmt}</span>
        <span className="text-neutral-500">▾</span>
      </button>

      {/* Popover */}
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

            <div className="text-xl font-semibold text-neutral-900 tabular-nums">{loading ? "…" : fmt}</div>
          </div>

          {err ? (
            <div className="px-4 pb-2 text-xs text-rose-600">{err}</div>
          ) : null}

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
              onClick={() => onTopUp({ refreshCredit: fetchCredit })} // ✅ modal kapandıktan sonra refresh için
            >
              + Kredi Yükle
            </button>

            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center h-10 px-3 rounded-lg",
                "border border-neutral-200 bg-white text-neutral-700 text-sm font-semibold",
                "hover:bg-neutral-50"
              )}
              onClick={fetchCredit}
              title="Krediyi yenile"
            >
              ↻
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
