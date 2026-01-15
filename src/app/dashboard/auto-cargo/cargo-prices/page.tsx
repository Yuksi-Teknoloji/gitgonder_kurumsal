//src/app/dashboard/auto-cargo/cargo-prices/page.tsx
"use client";

import * as React from "react";
import CreditTopUpModal from "@/src/components/credit/CreditTopUpModal";
import CreditChip from "@/src/components/credit/CreditChip";
import { getAuthToken } from "@/src/utils/auth";

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

function num(v: string) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <div className="mb-2 text-sm font-semibold text-neutral-800">
      {text}
      {required ? <span className="text-rose-500"> *</span> : null} <span className="text-neutral-400">ⓘ</span>
    </div>
  );
}

function extractCityName(s: string) {
  // "Beşiktaş, İstanbul" -> "İstanbul"
  const t = String(s || "").trim();
  if (!t) return "";
  const parts = t.split(",").map((x) => x.trim()).filter(Boolean);
  return (parts[parts.length - 1] || t).trim();
}

/* ================= API Types ================= */

type BoxRow = { l: number; w: number; h: number; weight: number };

type InventoryBox = {
  id: number;
  boxName: string;
  length: number;
  width: number;
  height: number;
};

type GetBoxesRes = {
  success?: boolean;
  message?: any;
  warnings?: any;
  otoErrorCode?: any;
  otoErrorMessage?: any;
  boxes?: InventoryBox[];
};

type AddBoxReq = {
  name: string;
  length: number;
  width: number;
  height: number;
};

type AddBoxRes = {
  success?: boolean;
  message?: any;
  warnings?: any;
  otoErrorCode?: any;
  otoErrorMessage?: any;
};

type OtoFeeReq = {
  weight: number;
  originCity: string;
  destinationCity: string;
  height: number;
  width: number;
  length: number;
  includeEstimatedDate: boolean;
};

type DeliveryCompany = {
  serviceType: string | null;
  deliveryOptionName: string | null;
  trackingType: any;
  score5: any;
  deliveryType: string | null;
  codCharge: number | null;
  pickupCutOffTime: string | null;
  maxOrderValue: number | null;
  maxCODValue: number | null;
  deliveryOptionId: number | null;
  extraWeightPerKg: number | null;
  estimatedDeliveryDate: string | null;
  deliveryCompanyName: string | null;
  estimatedPickupDate: string | null;
  checkAllBranches: any;
  returnFee: number | null;
  maxFreeWeight: number | null;
  avgDeliveryTime: string | null;
  price: number | null;
  logo: string | null;
  currency: string | null;
  pickupDropoff: string | null;
  cardOnDeliveryPercentage: string | null;
  needToVerifyCrDocStatus: any;
};

type OtoFeeRes = {
  success?: boolean;
  message?: any;
  warnings?: any;
  otoErrorCode?: any;
  otoErrorMessage?: any;
  deliveryCompany?: DeliveryCompany[];
};

/* ================= Page ================= */

export default function CargoPricesPage() {
  // Top form
  const [orderSearch, setOrderSearch] = React.useState("");
  const [origin, setOrigin] = React.useState("Beşiktaş, İstanbul");
  const [destination, setDestination] = React.useState("Çankaya, Ankara");

  // Box preset / inventory
  const [boxPreset, setBoxPreset] = React.useState("ambalaj");
  const [inventoryBoxes, setInventoryBoxes] = React.useState<InventoryBox[]>([]);
  const [boxesLoading, setBoxesLoading] = React.useState(false);
  const [boxesErr, setBoxesErr] = React.useState<string | null>(null);
  const [savingBox, setSavingBox] = React.useState(false);

  const [boxes, setBoxes] = React.useState<BoxRow[]>([{ l: 1, w: 1, h: 1, weight: 1 }]);
  const totalWeight = boxes.reduce((a, b) => a + (Number.isFinite(b.weight) ? b.weight : 0), 0);

  const [cod, setCod] = React.useState(false);
  const [codAmount, setCodAmount] = React.useState<string>("");

  // Credit modal
  const [creditBalance] = React.useState<number>(0);
  const [creditOpen, setCreditOpen] = React.useState(false);

  // Prices state (NO MOCK)
  const [pricesLoading, setPricesLoading] = React.useState(false);
  const [pricesErr, setPricesErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<DeliveryCompany[]>([]);

  // Table filters
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [selectedCompany, setSelectedCompany] = React.useState<string>("");

  function addBoxRowLocal() {
    setBoxes((b) => [...b, { l: 1, w: 1, h: 1, weight: 1 }]);
  }

  function updateBox(i: number, patch: Partial<BoxRow>) {
    setBoxes((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function applyInventoryBoxToFirstRow(bx: InventoryBox) {
    setBoxes((prev) => {
      const w = prev[0]?.weight ?? 1;
      const next: BoxRow[] = [{ l: bx.length, w: bx.width, h: bx.height, weight: w }, ...prev.slice(1)];
      return next;
    });
  }

  async function loadInventoryBoxes() {
    setBoxesErr(null);
    setBoxesLoading(true);

    const bearer = getBearerToken();
    if (!bearer) {
      setBoxesLoading(false);
      setBoxesErr("Token yok.");
      return;
    }

    try {
      const res = await fetch("/yuksi/oto/inventory/box", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${bearer}`,
        },
      });

      const json = await readJson<GetBoxesRes>(res);
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      const list = Array.isArray(json?.boxes) ? json.boxes : [];
      setInventoryBoxes(list);

      // input ile eşleşen varsa auto-apply
      const match = list.find((x) => String(x.boxName).toLowerCase() === String(boxPreset).toLowerCase());
      if (match) applyInventoryBoxToFirstRow(match);
    } catch (e: any) {
      setInventoryBoxes([]);
      setBoxesErr(e?.message || "Kutu listesi alınamadı.");
    } finally {
      setBoxesLoading(false);
    }
  }

  async function saveBoxToInventory() {
    setBoxesErr(null);

    const name = String(boxPreset || "").trim();
    if (!name) {
      setBoxesErr("Kutu adı zorunlu.");
      return;
    }

    const first = boxes[0];
    const length = Math.max(0, Math.round(first?.l ?? 0));
    const width = Math.max(0, Math.round(first?.w ?? 0));
    const height = Math.max(0, Math.round(first?.h ?? 0));
    if (!(length > 0 && width > 0 && height > 0)) {
      setBoxesErr("Kutu boyutları 0 olamaz.");
      return;
    }

    const bearer = getBearerToken();
    if (!bearer) {
      setBoxesErr("Token yok.");
      return;
    }

    setSavingBox(true);
    try {
      const body: AddBoxReq = { name, length, width, height };

      const res = await fetch("/yuksi/oto/inventory/add-box", {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(body),
      });

      const json = await readJson<AddBoxRes>(res);
      if (!res.ok || json?.success === false) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      // refresh list
      await loadInventoryBoxes();
    } catch (e: any) {
      setBoxesErr(e?.message || "Kutu eklenemedi.");
    } finally {
      setSavingBox(false);
    }
  }

  function resetAll() {
    setOrderSearch("");
    setOrigin("Beşiktaş, İstanbul");
    setDestination("Çankaya, Ankara");
    setBoxPreset("ambalaj");
    setBoxes([{ l: 1, w: 1, h: 1, weight: 1 }]);
    setCod(false);
    setCodAmount("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedCompany("");
    setPricesErr(null);
    setRows([]);
  }

  async function fetchPrices() {
    setPricesErr(null);
    setPricesLoading(true);

    const bearer = getBearerToken();
    if (!bearer) {
      setPricesLoading(false);
      setPricesErr("Token yok.");
      return;
    }

    try {
      const originCity = extractCityName(origin);
      const destinationCity = extractCityName(destination);

      const first = boxes[0] || { l: 0, w: 0, h: 0, weight: 0 };

      const payload: OtoFeeReq = {
        weight: Math.max(0, Number(totalWeight || first.weight || 0)),
        originCity,
        destinationCity,
        height: Math.max(0, Number(first.h || 0)),
        width: Math.max(0, Number(first.w || 0)),
        length: Math.max(0, Number(first.l || 0)),
        includeEstimatedDate: true,
      };

      const res = await fetch("/yuksi/oto/logistics/oto-fee", {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await readJson<OtoFeeRes>(res);
      if (!res.ok || json?.success === false) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      const list = Array.isArray(json?.deliveryCompany) ? json.deliveryCompany : [];
      setRows(list);

      // company filter reset if now invalid
      if (selectedCompany && !list.some((x) => (x.deliveryOptionName || x.deliveryCompanyName || "") === selectedCompany)) {
        setSelectedCompany("");
      }
    } catch (e: any) {
      setRows([]);
      setPricesErr(e?.message || "Fiyatlar alınamadı.");
    } finally {
      setPricesLoading(false);
    }
  }

  const filteredRows = React.useMemo(() => {
    const min = minPrice ? num(minPrice) : null;
    const max = maxPrice ? num(maxPrice) : null;

    return rows.filter((r) => {
      const name = (r.deliveryOptionName || r.deliveryCompanyName || "").trim();

      if (selectedCompany && name !== selectedCompany) return false;

      const numeric = Number(r.price ?? NaN);
      if (Number.isFinite(numeric)) {
        if (min !== null && numeric < min) return false;
        if (max !== null && numeric > max) return false;
      } else {
        // fiyat yoksa filtrelerden etkilenmesin
        if (min !== null || max !== null) return false;
      }

      return true;
    });
  }, [rows, minPrice, maxPrice, selectedCompany]);

  React.useEffect(() => {
    // sayfa açılır açılmaz kutuları çek
    loadInventoryBoxes().catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-6 py-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center">🧮</div>
          <h1 className="text-2xl font-semibold text-neutral-900">Fiyat Hesaplayıcı</h1>
          <span className="text-neutral-400">ⓘ</span>
        </div>

        <div className="shrink-0">
          <CreditChip creditBalance={creditBalance} onTopUp={() => setCreditOpen(true)} />
        </div>
      </div>

      {/* Top Panel */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white">
        <div className="p-6">
          {/* errors */}
          {boxesErr ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {boxesErr}
            </div>
          ) : null}

          {pricesErr ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {pricesErr}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <Label text="Sipariş Seçin" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔎</span>
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Order ID veya alıcı adıyla arayın"
                  className="h-10 w-full rounded-lg border border-neutral-200 px-10 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <Label text="Kutu Seçin" />
                  <button
                    type="button"
                    onClick={loadInventoryBoxes}
                    disabled={boxesLoading}
                    className="text-xs font-semibold rounded-lg px-2 py-1 border border-neutral-200 hover:bg-neutral-50 disabled:opacity-60"
                  >
                    {boxesLoading ? "Yükleniyor…" : "Yenile"}
                  </button>
                </div>

                {/* Kutu adı input + datalist */}
                <div className="relative">
                  <input
                    value={boxPreset}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBoxPreset(v);

                      const match = inventoryBoxes.find(
                        (x) => String(x.boxName).toLowerCase() === String(v).toLowerCase()
                      );
                      if (match) applyInventoryBoxToFirstRow(match);
                    }}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    list="box-presets"
                    placeholder="Kutu adı (envanterden seç ya da yeni isim yaz)"
                  />
                  <datalist id="box-presets">
                    {inventoryBoxes.map((b) => (
                      <option key={b.id} value={b.boxName} />
                    ))}
                  </datalist>

                  <button
                    type="button"
                    onClick={() => setBoxPreset("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    aria-label="Temizle"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={addBoxRowLocal}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    + Kutu satırı ekle
                  </button>

                  <button
                    type="button"
                    onClick={saveBoxToInventory}
                    disabled={savingBox}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    title="İlk kutunun ölçülerini bu isimle envantere kaydeder"
                  >
                    {savingBox ? "Kaydediliyor…" : "Kutuyu Kaydet"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Label text="Çıkış Noktası" required />
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />

              <div className="mt-4">
                <Label text="Kutu Boyutları" required />
                <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 space-y-3">
                  {boxes.map((b, i) => (
                    <div key={i}>
                      {boxes.length > 1 ? (
                        <div className="mb-2 text-xs font-semibold text-neutral-600">Kutu {i + 1}</div>
                      ) : null}

                      <div className="grid grid-cols-7 items-center gap-2 text-sm">
                        <input
                          value={b.l}
                          onChange={(e) => updateBox(i, { l: num(e.target.value) })}
                          className="col-span-2 h-9 rounded-lg border border-neutral-200 px-2 outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <div className="text-center text-neutral-400">x</div>
                        <input
                          value={b.w}
                          onChange={(e) => updateBox(i, { w: num(e.target.value) })}
                          className="col-span-2 h-9 rounded-lg border border-neutral-200 px-2 outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <div className="text-center text-neutral-400">x</div>
                        <input
                          value={b.h}
                          onChange={(e) => updateBox(i, { h: num(e.target.value) })}
                          className="col-span-2 h-9 rounded-lg border border-neutral-200 px-2 outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <div className="col-span-7 text-right text-xs text-neutral-400">cm</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-xs text-neutral-500">
                  Envanterden kutu seçersen, <span className="font-semibold">ilk kutunun</span> ölçüleri otomatik dolar.
                </div>
              </div>
            </div>

            <div>
              <Label text="Varış Noktası" required />
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />

              <div className="mt-4">
                <Label text="Ağırlık (kg)" required />
                <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 space-y-3">
                  {boxes.map((b, i) => (
                    <div key={i}>
                      {boxes.length > 1 ? (
                        <div className="mb-2 text-xs font-semibold text-neutral-600">Kutu {i + 1}</div>
                      ) : null}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateBox(i, { weight: Math.max(0, (boxes[i]?.weight ?? 1) - 1) })}
                          className="h-9 w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                        >
                          −
                        </button>
                        <input
                          value={b.weight}
                          onChange={(e) => updateBox(i, { weight: num(e.target.value) })}
                          className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <div className="text-sm text-neutral-500">kg</div>
                        <button
                          type="button"
                          onClick={() => updateBox(i, { weight: (boxes[i]?.weight ?? 1) + 1 })}
                          className="h-9 w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                        >
                          +
                        </button>
                      </div>

                      {i === boxes.length - 1 ? (
                        <div className="mt-2 text-xs text-neutral-500 text-right">
                          Kargo ücretinizin sonradan artmaması için doğru ağırlık giriniz.
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* COD row */}
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <div className="text-sm font-semibold text-neutral-800">
              Kapıda ödeme mi?<span className="text-rose-500"> *</span>
            </div>
            <div className="mt-3 flex items-center gap-6 text-sm text-neutral-700">
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={!cod} onChange={() => setCod(false)} />
                Hayır
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={cod} onChange={() => setCod(true)} />
                Evet
              </label>
            </div>

            {cod ? (
              <div className="mt-4">
                <Label text="Kapıda Ödeme Tutarı" required />
                <div className="relative">
                  <input
                    value={codAmount}
                    onChange={(e) => setCodAmount(e.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-14 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500">
                    TL
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-60 px-6 py-4">
          <button onClick={resetAll} className="text-sm font-semibold text-neutral-700 hover:text-neutral-900">
            İptal Et
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            onClick={fetchPrices}
            disabled={pricesLoading}
          >
            {pricesLoading ? "Hesaplanıyor…" : "🧾 Kargo Fiyatlarını Göster"}
          </button>
        </div>
      </div>

      {/* Table Panel */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="grid grid-cols-[180px_120px_140px_160px_250px_160px_60px] gap-3 text-xs font-semibold text-neutral-600">
            <div>Kargo Şirketi ⓘ</div>
            <div>Hizmet Türü ⓘ</div>
            <div>Teslimat Süresi ⓘ</div>
            <div>Teslim Alma Koşulu ⓘ</div>
            <div>Teslimat Türü ⓘ</div>
            <div>Fiyat ⓘ</div>
            <div />
          </div>

          <div className="mt-3 grid grid-cols-[180px_120px_140px_160px_250px_160px_60px] gap-3">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
              disabled={rows.length === 0}
            >
              <option value="">Seç</option>
              {Array.from(
                new Set(rows.map((x) => (x.deliveryOptionName || x.deliveryCompanyName || "").trim()).filter(Boolean))
              ).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm" disabled>
              <option>—</option>
            </select>

            <select className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm" disabled>
              <option>—</option>
            </select>

            <select className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm" disabled>
              <option>—</option>
            </select>

            <select className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm" disabled>
              <option>—</option>
            </select>

            <div className="flex gap-2">
              <input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder="En az"
                disabled={rows.length === 0}
              />
              <input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder="En fazla"
                disabled={rows.length === 0}
              />
            </div>

            <div />
          </div>
        </div>

        <div className="divide-y divide-neutral-100">
          {filteredRows.map((r, idx) => {
            const companyName = (r.deliveryOptionName || r.deliveryCompanyName || `company-${idx}`).trim();
            const currency = (r.currency || "").trim();
            const priceStr =
              r.price === null || r.price === undefined
                ? "-"
                : currency
                ? `${Number(r.price).toLocaleString("tr-TR")} ${currency}`
                : `${Number(r.price).toLocaleString("tr-TR")}`;

            const eta =
              (r.estimatedDeliveryDate && String(r.estimatedDeliveryDate)) ||
              (r.avgDeliveryTime && String(r.avgDeliveryTime)) ||
              "—";

            const pickupReadable =
              r.pickupDropoff === "freePickup"
                ? "🚚 Ücretsiz adresten alım"
                : r.pickupDropoff
                ? String(r.pickupDropoff)
                : "—";

            const deliveryReadable =
              r.deliveryType === "toCustomerDoorstepOrPickupByCustomer"
                ? "📍 Adrese teslim / müşteri teslim alabilir"
                : r.deliveryType
                ? `📍 ${r.deliveryType}`
                : "—";

            return (
              <div key={`${companyName}-${idx}`} className="px-4 py-4">
                <div className="grid grid-cols-[180px_120px_140px_160px_250px_160px_60px] items-center gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-white flex items-center justify-center">
                      {r.logo ? (
                        <img
                          src={r.logo}
                          alt={`${companyName} logo`}
                          className="h-full w-full object-contain p-0"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs text-neutral-500">🏷️</span>
                      )}
                    </div>
                    <div className="font-semibold text-neutral-900">{companyName || "—"}</div>
                  </div>

                  <div className="text-neutral-700">{r.serviceType || "—"}</div>

                  <div>
                    <span className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {eta}
                    </span>
                  </div>

                  <div className="text-neutral-700">{pickupReadable}</div>

                  <div className="text-neutral-700">{deliveryReadable}</div>

                  <div className="font-semibold text-neutral-900">{priceStr}</div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="h-10 w-28 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
                      onClick={() => {
                        alert(
                          `Seçildi → ${companyName}\nprice=${priceStr}\ndeliveryOptionId=${r.deliveryOptionId ?? "-"}`
                        );
                      }}
                    >
                      Seç
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {rows.length === 0 && !pricesLoading ? (
            <div className="px-4 py-10 text-center text-sm text-neutral-500">
              Henüz veri yok. Üstten <span className="font-semibold">“Kargo Fiyatlarını Göster”</span> deyip fiyat çek.
            </div>
          ) : null}

          {filteredRows.length === 0 && rows.length > 0 ? (
            <div className="px-4 py-10 text-center text-sm text-neutral-500">Filtreye göre sonuç bulunamadı.</div>
          ) : null}
        </div>
      </div>

      {/* tiny footer note */}
      <div className="mt-3 text-xs text-neutral-500">
        Toplam ağırlık: <span className="font-semibold text-neutral-700">{totalWeight} kg</span>
      </div>

      <CreditTopUpModal open={creditOpen} onOpenChange={setCreditOpen} creditBalance={creditBalance} />
    </div>
  );
}
