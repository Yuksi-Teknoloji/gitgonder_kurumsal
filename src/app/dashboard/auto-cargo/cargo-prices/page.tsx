//src/app/dashboard/auto-cargo/cargo-prices/page.tsx
"use client";

import * as React from "react";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

type BoxRow = { l: number; w: number; h: number; weight: number };

type PriceRow = {
  company: string;
  service: string;
  eta: string;
  pickup: Array<"Adresten Alım" | "Şubeye Teslim">;
  delivery: "Müşteri adresine teslim";
  price: string;
};
const COMPANY_LOGO: Record<string, string> = {
  HepsiJET: "/Cargo/hepsijet.png",
  "Sürat Kargo": "/Cargo/surat.png",
  Kargoist: "/Cargo/kargoist.png",
  "Aras Kargo Şehirler Arası": "/Cargo/aras.png",
  "Yurtiçi Kargo": "/Cargo/yurtici.png",
  "Kolay Gelsin": "/Cargo/kolaygelsin.png",
  "PTT Kargo": "/Cargo/ptt.png",
};

const MOCK_PRICES: PriceRow[] = [
  { company: "HepsiJET", service: "Hızlı", eta: "1 ile 3 İş Günü", pickup: ["Adresten Alım"], delivery: "Müşteri adresine teslim", price: "₺ 86,00" },
  { company: "Sürat Kargo", service: "Hızlı", eta: "1 ile 3 İş Günü", pickup: ["Şubeye Teslim"], delivery: "Müşteri adresine teslim", price: "₺ 103,00" },
  { company: "Kargoist", service: "Hızlı", eta: "1 ile 3 İş Günü", pickup: ["Şubeye Teslim", "Adresten Alım"], delivery: "Müşteri adresine teslim", price: "₺ 116,00" },
  { company: "Aras Kargo Şehirler Arası", service: "Hızlı", eta: "1 ile 3 İş Günü", pickup: ["Şubeye Teslim"], delivery: "Müşteri adresine teslim", price: "₺ 117,00" },
  { company: "Yurtiçi Kargo", service: "Hızlı", eta: "1 ile 3 İş Günü", pickup: ["Şubeye Teslim"], delivery: "Müşteri adresine teslim", price: "₺ 119,00" },
  { company: "Kolay Gelsin", service: "Hızlı", eta: "1 ile 3 İş Günü", pickup: ["Adresten Alım"], delivery: "Müşteri adresine teslim", price: "₺ 125,00" },
  { company: "PTT Kargo", service: "Hızlı", eta: "1 ile 7 İş Günü", pickup: ["Şubeye Teslim"], delivery: "Müşteri adresine teslim", price: "₺ 142,00" },
];

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

export default function CargoPricesPage() {
  // Top form
  const [orderSearch, setOrderSearch] = React.useState("");
  const [origin, setOrigin] = React.useState("Beşiktaş, İstanbul");
  const [destination, setDestination] = React.useState("Çankaya, Ankara");
  const [boxPreset, setBoxPreset] = React.useState("ambalaj");

  const [boxes, setBoxes] = React.useState<BoxRow[]>([{ l: 1, w: 1, h: 1, weight: 1 }]);
  const totalWeight = boxes.reduce((a, b) => a + (Number.isFinite(b.weight) ? b.weight : 0), 0);

  const [cod, setCod] = React.useState(false);
  const [codAmount, setCodAmount] = React.useState<string>("");

  // Table filters (mock)
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");

  const [selectedCompany, setSelectedCompany] = React.useState<string>("");

  const filteredRows = React.useMemo(() => {
    const min = minPrice ? num(minPrice) : null;
    const max = maxPrice ? num(maxPrice) : null;

    return MOCK_PRICES.filter((r) => {
      if (selectedCompany && r.company !== selectedCompany) return false;

      const numeric = Number(String(r.price).replace(/[^\d,]/g, "").replace(",", "."));
      if (min !== null && numeric < min) return false;
      if (max !== null && numeric > max) return false;
      return true;
    });
  }, [minPrice, maxPrice, selectedCompany]);

  function addBox() {
    setBoxes((b) => [...b, { l: 1, w: 1, h: 1, weight: 1 }]);
  }

  function updateBox(i: number, patch: Partial<BoxRow>) {
    setBoxes((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
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
  }

  return (
    <div className="px-6 py-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center">🧮</div>
        <h1 className="text-2xl font-semibold text-neutral-900">Fiyat Hesaplayıcı</h1>
        <span className="text-neutral-400">ⓘ</span>
      </div>

      {/* Top Panel */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white">
        <div className="p-6">
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
                <Label text="Kutu Seçin" />
                {/* X kaymasını düzelt: input + X aynı satırda, buton aşağıda */}
                <div className="relative">
                  <input
                    value={boxPreset}
                    onChange={(e) => setBoxPreset(e.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => setBoxPreset("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    aria-label="Temizle"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={addBox}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    + Yeni kutu ekle
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

            {/* Kapıda ödeme = Evet ise kutuyu göster */}
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
        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <button onClick={resetAll} className="text-sm font-semibold text-neutral-700 hover:text-neutral-900">
            İptal Et
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            onClick={() => {
              // TODO: endpoint gelince fetch
              // Şimdilik tablo zaten görünür; istersen burada "loading" açtırırız.
              void 0;
            }}
          >
            🧾 Kargo Fiyatlarını Göster
          </button>
        </div>
      </div>

      {/* Table Panel */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="grid grid-cols-[120px_120px_120px_120px_250px_160px_140px] gap-3 text-xs font-semibold text-neutral-600">
            <div>Kargo Şirketi ⓘ</div>
            <div>Hizmet Türü ⓘ</div>
            <div>Teslimat Süresi ⓘ</div>
            <div>Teslim Alma / Teslim Etme Koşulları ⓘ</div>
            <div>Teslimat Türü ⓘ</div>
            <div>Fiyat ⓘ</div>
            <div />
          </div>

          <div className="mt-3 grid grid-cols-[120px_120px_120px_120px_250px_160px_140px] gap-3">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
            >
              <option value="">Seç</option>
              {Array.from(new Set(MOCK_PRICES.map((x) => x.company))).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
              <option>Seç</option>
            </select>

            <select className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
              <option>Seç</option>
            </select>

            <select className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
              <option>Seç</option>
            </select>

            <select className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
              <option>Seç</option>
            </select>

            <div className="flex gap-2">
              <input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder="En az"
              />
              <input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder="En fazla"
              />
            </div>

            <div />
          </div>
        </div>

        <div className="divide-y divide-neutral-100">
          {filteredRows.map((r) => (
            <div key={r.company} className="px-4 py-4">
              <div className="grid grid-cols-[120px_120px_120px_120px_250px_160px_140px] items-center gap-3 text-sm">
                <div className="h-13 w-13 overflow-hidden rounded-lg border border-neutral-200 bg-white flex items-center justify-center">
                  {COMPANY_LOGO[r.company] ? (
                    <img
                      src={COMPANY_LOGO[r.company]}
                      alt={`${r.company} logo`}
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-neutral-500">🏷️</span>
                  )}
                </div>

                <div className="text-neutral-700">{r.service}</div>

                <div>
                  <span className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {r.eta}
                  </span>
                </div>

                <div className="text-neutral-700">
                  {r.pickup.includes("Adresten Alım") ? (
                    <div className="flex items-center gap-2">🚚 Adresten Alım</div>
                  ) : null}
                  {r.pickup.includes("Şubeye Teslim") ? (
                    <div className={cn("flex items-center gap-2", r.pickup.includes("Adresten Alım") ? "mt-1" : "")}>
                      🏢 Şubeye Teslim
                    </div>
                  ) : null}
                </div>

                <div className="text-neutral-700">📍 {r.delivery}</div>

                <div className="font-semibold text-neutral-900">{r.price}</div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="h-10 w-28 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
                    onClick={() => {
                      // TODO: endpoint gelince select action
                      alert(`Mock: seçildi → ${r.company} (${r.price})`);
                    }}
                  >
                    Seç
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-neutral-500">Filtreye göre sonuç bulunamadı.</div>
          ) : null}
        </div>
      </div>
      {/* tiny footer note */}
      <div className="mt-3 text-xs text-neutral-500">
        Toplam ağırlık (mock): <span className="font-semibold text-neutral-700">{totalWeight} kg</span>
      </div>
    </div>
  );
}
