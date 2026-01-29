//src/app/dashboard/auto-cargo/cargo-prices/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

/* ========= Helpers ========= */
async function readJson<T = any>(res: Response): Promise<T> {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : (null as any);
  } catch {
    return t as any;
  }
}

const pickMsg = (d: any, fb: string) =>
  d?.error?.message || d?.otoErrorMessage || d?.message || d?.detail || d?.title || fb;

function getBearerToken() {
  try {
    return getAuthToken() || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token") || "";
  } catch {
    return getAuthToken() || "";
  }
}

function toNum(v: any, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function fmtMoney(amount?: number | null, currency?: string | null) {
  const n = toNum(amount, 0);
  const cur = String(currency || "TRY");
  const fixed = n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (cur === "TRY") return `₺ ${fixed}`;
  return `${cur} ${fixed}`;
}

/* ========= Localization (TR) ========= */
function trServiceType(v?: string | null) {
  const x = String(v || "").toLowerCase();
  if (!x) return "-";
  if (x === "express") return "Hızlı";
  return v || "-";
}

function trAvgDeliveryTime(v?: string | null) {
  const x = String(v || "");
  if (!x) return "-";
  if (x === "1to3WorkingDays") return "1-3 iş günü";
  if (x === "1to7WorkingDays") return "1-7 iş günü";
  return x;
}

function trDeliveryType(v?: string | null) {
  const x = String(v || "");
  if (!x) return "-";
  if (x === "toCustomerDoorstep") return "Müşteri adresine teslim";
  return x;
}

function trPickupDropoff(v?: string | null) {
  const x = String(v || "");
  if (!x) return "-";
  if (x === "dropoffOnly") return "Şubeden alım";
  if (x === "freePickup") return "Adresten alım";
  if (x === "freePickupDropoff") return "Şubeden ve adresten alım";
  return x;
}

/* ========= Types ========= */

type DeliveryCompanyOption = {
  serviceType?: string | null;
  deliveryOptionName?: string | null;
  trackingType?: string | null;
  score5?: any;
  deliveryType?: string | null;
  codCharge?: number | null;
  pickupCutOffTime?: string | null;
  maxOrderValue?: number | null;
  maxCODValue?: number | null;
  deliveryOptionId?: number | null;
  extraWeightPerKg?: number | null;
  estimatedDeliveryDate?: string | null;
  deliveryCompanyName?: string | null;
  estimatedPickupDate?: string | null;
  checkAllBranches?: string | null;
  returnFee?: number | null;
  maxFreeWeight?: number | null;
  avgDeliveryTime?: string | null;
  price?: number | null;
  logo?: string | null;
  currency?: string | null;
  pickupDropoff?: string | null;
  cardOnDeliveryPercentage?: string | null;
  needToVerifyCrDocStatus?: any;
};

type OtoFeeResponse = {
  success: boolean;
  message: string | null;
  warnings: any;
  otoErrorCode: any;
  otoErrorMessage: string | null;
  deliveryCompany: DeliveryCompanyOption[];
};

type OtoFeeRequest = {
  originCity: string;
  destinationCity: string;
  weight: number;
  packageCount: number;
  length: number;
  width: number;
  height: number;
};

export default function CargoPricesPage() {
  const router = useRouter();
  const token = React.useMemo(getBearerToken, []);

  const [form, setForm] = React.useState<OtoFeeRequest>({
    originCity: "Ankara",
    destinationCity: "İstanbul",
    weight: 1,
    packageCount: 1,
    length: 10,
    width: 10,
    height: 10,
  });

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string>("");
  const [data, setData] = React.useState<OtoFeeResponse | null>(null);

  // sort
  const [sortBy, setSortBy] = React.useState<"price_asc" | "price_desc" | "fastest">("price_asc");

  React.useEffect(() => {
    if (!token) router.replace("/");
  }, [token, router]);

  function setField<K extends keyof OtoFeeRequest>(k: K, v: OtoFeeRequest[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function validate(): string | null {
    if (!String(form.originCity || "").trim()) return "originCity zorunlu.";
    if (!String(form.destinationCity || "").trim()) return "destinationCity zorunlu.";
    if (toNum(form.weight, 0) <= 0) return "weight 0'dan büyük olmalı.";
    if (toNum(form.packageCount, 0) <= 0) return "packageCount 0'dan büyük olmalı.";
    if (toNum(form.length, 0) <= 0) return "length 0'dan büyük olmalı.";
    if (toNum(form.width, 0) <= 0) return "width 0'dan büyük olmalı.";
    if (toNum(form.height, 0) <= 0) return "height 0'dan büyük olmalı.";
    return null;
  }

  async function fetchPrices() {
    setErr("");
    setLoading(true);
    setData(null);

    const v = validate();
    if (v) {
      setErr(v);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/yuksi/oto/logistics/oto-fee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          originCity: String(form.originCity || "").trim(),
          destinationCity: String(form.destinationCity || "").trim(),
          weight: toNum(form.weight, 0),
          packageCount: toNum(form.packageCount, 0),
          length: toNum(form.length, 0),
          width: toNum(form.width, 0),
          height: toNum(form.height, 0),
        } satisfies OtoFeeRequest),
      });

      const j = await readJson<OtoFeeResponse>(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok || !j?.success) throw new Error(pickMsg(j, `Ücret sorgusu başarısız (HTTP ${res.status})`));

      setData({
        ...j,
        deliveryCompany: Array.isArray(j.deliveryCompany) ? j.deliveryCompany : [],
      });
    } catch (e: any) {
      setErr(String(e?.message || e || "Bilinmeyen hata"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const list = React.useMemo(() => {
    const arr = data?.deliveryCompany ? [...data.deliveryCompany] : [];
    if (arr.length === 0) return arr;

    if (sortBy === "price_asc") {
      arr.sort((a, b) => toNum(a.price, 1e18) - toNum(b.price, 1e18));
    } else if (sortBy === "price_desc") {
      arr.sort((a, b) => toNum(b.price, -1) - toNum(a.price, -1));
    } else if (sortBy === "fastest") {
      // avgDeliveryTime string, "1to3WorkingDays" gibi
      const rank = (s?: string | null) => {
        const x = String(s || "").toLowerCase();
        if (!x) return 999;
        if (x.includes("1to3")) return 10;
        if (x.includes("1to7")) return 30;
        return 100;
      };
      arr.sort((a, b) => rank(a.avgDeliveryTime) - rank(b.avgDeliveryTime));
    }

    return arr;
  }, [data, sortBy]);

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center shrink-0">💸</div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">Kargo Ücretleri</h1>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            className="flex-1 sm:flex-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={() => router.back()}
            title="Geri"
          >
            ‹ Geri
          </button>
          <button
            type="button"
            className="flex-1 sm:flex-none rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            onClick={fetchPrices}
            disabled={loading}
            title="Ücret sorgula"
          >
            {loading ? "Sorgulanıyor…" : "Ücret Sorgula"}
          </button>
        </div>
      </div>

      {/* Form + Results */}
      <div className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-[420px_1fr]">
        {/* Form card */}
        <div className="rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
          <div className="text-sm font-semibold text-neutral-900">Sorgu Parametreleri</div>
          {err ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 break-words">
              {err}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <div className="grid gap-1">
              <div className="text-xs font-semibold text-neutral-600">Gönderici Şehir</div>
              <input
                className="h-10 rounded-lg border border-neutral-200 px-3 text-sm w-full"
                value={form.originCity}
                onChange={(e) => setField("originCity", e.target.value)}
                placeholder="Ankara"
              />
            </div>

            <div className="grid gap-1">
              <div className="text-xs font-semibold text-neutral-600">Alıcı Şehir</div>
              <input
                className="h-10 rounded-lg border border-neutral-200 px-3 text-sm w-full"
                value={form.destinationCity}
                onChange={(e) => setField("destinationCity", e.target.value)}
                placeholder="İstanbul"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1">
                <div className="text-xs font-semibold text-neutral-600">Ağırlık (kg)</div>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-10 rounded-lg border border-neutral-200 px-3 text-sm w-full"
                  value={form.weight}
                  onChange={(e) => setField("weight", toNum(e.target.value, 0))}
                />
              </div>

              <div className="grid gap-1">
                <div className="text-xs font-semibold text-neutral-600">Paket Sayısı</div>
                <input
                  type="number"
                  min={1}
                  step="1"
                  className="h-10 rounded-lg border border-neutral-200 px-3 text-sm w-full"
                  value={form.packageCount}
                  onChange={(e) => setField("packageCount", Math.max(1, Math.floor(toNum(e.target.value, 1))) as any)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1">
                <div className="text-xs font-semibold text-neutral-600">Uzunluk</div>
                <input
                  type="number"
                  min={1}
                  step="1"
                  className="h-10 rounded-lg border border-neutral-200 px-3 text-sm w-full"
                  value={form.length}
                  onChange={(e) => setField("length", toNum(e.target.value, 0))}
                />
              </div>

              <div className="grid gap-1">
                <div className="text-xs font-semibold text-neutral-600">Genişlik</div>
                <input
                  type="number"
                  min={1}
                  step="1"
                  className="h-10 rounded-lg border border-neutral-200 px-3 text-sm w-full"
                  value={form.width}
                  onChange={(e) => setField("width", toNum(e.target.value, 0))}
                />
              </div>

              <div className="grid gap-1 sm:col-span-2">
                <div className="text-xs font-semibold text-neutral-600">Yükseklik</div>
                <input
                  type="number"
                  min={1}
                  step="1"
                  className="h-10 rounded-lg border border-neutral-200 px-3 text-sm w-full"
                  value={form.height}
                  onChange={(e) => setField("height", toNum(e.target.value, 0))}
                />
              </div>
            </div>

            <div className="mt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                className="h-10 flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
                onClick={() =>
                  setForm({
                    originCity: "",
                    destinationCity: "",
                    weight: 1,
                    packageCount: 1,
                    length: 1,
                    width: 1,
                    height: 1,
                  })
                }
                disabled={loading}
                title="Örnek değerler"
              >
                Sıfırla
              </button>

              <button
                type="button"
                className="h-10 flex-1 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={fetchPrices}
                disabled={loading}
              >
                {loading ? "Sorgulanıyor…" : "Sorgula"}
              </button>
            </div>
          </div>
        </div>

        {/* Results card */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="text-sm font-semibold text-neutral-900">Sonuçlar</div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:ml-auto">
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-neutral-600 whitespace-nowrap">Sırala:</div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-9 flex-1 sm:flex-none rounded-lg border border-neutral-200 bg-white px-3 text-sm min-w-0"
                  disabled={loading}
                >
                  <option value="price_asc">Fiyat (Artan)</option>
                  <option value="price_desc">Fiyat (Azalan)</option>
                  <option value="fastest">En hızlı</option>
                </select>
              </div>

              <button
                type="button"
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 whitespace-nowrap"
                onClick={() => {
                  setData(null);
                  setErr("");
                }}
                disabled={loading}
                title="Sonuçları temizle"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {loading ? (
              <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
                Yükleniyor…
              </div>
            ) : !data ? (
              <div className="rounded-lg border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
                Henüz sorgu yok. Soldan değerleri girip “Sorgula” de. 🙂
              </div>
            ) : list.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
                Kargo seçeneği bulunamadı.
              </div>
            ) : (
              <div className="grid gap-3">
                {list.map((o, idx) => {
                  const name = o.deliveryOptionName || o.deliveryCompanyName || "Kargo";
                  const price = fmtMoney(o.price, o.currency);
                  const id = o.deliveryOptionId ?? "-";
                  const avg = trAvgDeliveryTime(o.avgDeliveryTime);
                  const pickup = trPickupDropoff(o.pickupDropoff);
                  const svc = trServiceType(o.serviceType);
                  const dtype = trDeliveryType(o.deliveryType);
                  const cutOff = o.pickupCutOffTime ? `Cutoff: ${o.pickupCutOffTime}` : "";
                  const cod = typeof o.codCharge === "number" ? fmtMoney(o.codCharge, o.currency) : "-";
                  const returnFee = typeof o.returnFee === "number" ? fmtMoney(o.returnFee, o.currency) : "-";

                  return (
                    <div
                      key={`${String(o.deliveryOptionId ?? idx)}-${idx}`}
                      className={cn("rounded-xl border border-neutral-200 bg-white p-3 sm:p-4 hover:bg-neutral-50")}
                    >
                      <div className="flex items-start gap-3">
                        {o.logo ? (
                          <img
                            src={o.logo}
                            alt={name}
                            className="h-12 w-12 rounded-lg border border-neutral-200 object-cover bg-white shrink-0"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg border border-neutral-200 bg-neutral-100 flex items-center justify-center shrink-0">
                            🚚
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 truncate text-sm font-semibold text-neutral-900">{name}</div>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                            <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 whitespace-nowrap">
                              {svc}
                            </span>
                            <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 whitespace-nowrap">{avg}</span>
                            <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 whitespace-nowrap">{dtype}</span>
                            <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 whitespace-nowrap">{pickup}</span>
                          </div>

                          <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2">
                            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                              <div className="text-[11px] font-semibold text-neutral-600">Fiyat</div>
                              <div className="mt-1 text-sm font-semibold text-neutral-900 tabular-nums break-words">{price}</div>
                            </div>

                            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                              <div className="text-[11px] font-semibold text-neutral-600">İade Ücreti</div>
                              <div className="mt-1 text-sm font-semibold text-neutral-900 tabular-nums break-words">{returnFee}</div>
                            </div>
                          </div>

                          {o.checkAllBranches ? (
                            <div className="mt-3 text-xs text-neutral-600 break-words">
                              Şube:{" "}
                              <a
                                href={o.checkAllBranches}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-indigo-700 underline break-all"
                              >
                                link
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
