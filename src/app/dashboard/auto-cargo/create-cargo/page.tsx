//src/app/dashboard/auto-cargo/create-cargo/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

type StepKey = 1 | 2 | 3 | 4;

const STEPS: Array<{ n: StepKey; label: string }> = [
  { n: 1, label: "Adres Detayları" },
  { n: 2, label: "Kargo Paketi Bilgileri" },
  { n: 3, label: "Gönderim Ücretleri" },
  { n: 4, label: "Ödeme Onay" },
];

function IconBox(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 8l-9-5-9 5 9 5 9-5Z" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 8v10l9 5 9-5V8" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 13v10" />
    </svg>
  );
}

type CarrierRow = {
  name: string;
  service: string;
  eta: string;
  pickup: "Şubeye Teslim" | "Adresten Alım";
  delivery: "Müşteri adresine teslim";
  price: string;
};
const CARRIER_LOGO: Record<string, string> = {
  "HepsiJET": "/Cargo/hepsijet.png",
  "Sürat Kargo": "/Cargo/surat.png",
  "Kargoist": "/Cargo/kargoist.png",
  "Aras Kargo": "/Cargo/aras.png",
  "Yurtiçi Kargo": "/Cargo/yurtici.png",
  "Kolay Gelsin": "/Cargo/kolaygelsin.png",
  "PTT Kargo": "/Cargo/ptt.png",
};

const MOCK_CARRIERS: CarrierRow[] = [
  { name: "Kargoist", service: "Hızlı", eta: "1 ile 3 İş Günü", pickup: "Şubeye Teslim", delivery: "Müşteri adresine teslim", price: "₺ 156,00" },
  { name: "Sürat Kargo", service: "Hızlı", eta: "1 ile 3 İş Günü", pickup: "Şubeye Teslim", delivery: "Müşteri adresine teslim", price: "₺ 162,00" },
  { name: "Aras Kargo", service: "Hızlı", eta: "1 ile 3 İş Günü", pickup: "Şubeye Teslim", delivery: "Müşteri adresine teslim", price: "₺ 192,00" },
  { name: "PTT Kargo", service: "Hızlı", eta: "1 ile 7 İş Günü", pickup: "Şubeye Teslim", delivery: "Müşteri adresine teslim", price: "₺ 220,00" },
  { name: "Kolay Gelsin", service: "Hızlı", eta: "1 ile 7 İş Günü", pickup: "Şubeye Teslim", delivery: "Müşteri adresine teslim", price: "₺ 128,00" },
  { name: "Yurtiçi Kargo", service: "Hızlı", eta: "1 ile 7 İş Günü", pickup: "Şubeye Teslim", delivery: "Müşteri adresine teslim", price: "₺ 220,00" },
  { name: "HepsiJET", service: "Hızlı", eta: "1 ile 7 İş Günü", pickup: "Şubeye Teslim", delivery: "Müşteri adresine teslim", price: "₺ 220,00" },
];

export default function CreateCargoPage() {
  const [step, setStep] = React.useState<StepKey>(1);

  // Step 1 (Adres)
  const [pickupLocation, setPickupLocation] = React.useState("My Pickup Location");
  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState("");
  const [country, setCountry] = React.useState("Türkiye");
  const [fullAddress, setFullAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [zip, setZip] = React.useState("");

  // Step 2 (Paket)
  const [boxes, setBoxes] = React.useState<Array<{ l: number; w: number; h: number; weight: number }>>([
    { l: 1, w: 1, h: 1, weight: 0 },
    { l: 1, w: 1, h: 1, weight: 0 },
  ]);
  const totalWeight = boxes.reduce((a, b) => a + (Number.isFinite(b.weight) ? b.weight : 0), 0);
  const [packageContent, setPackageContent] = React.useState("");
  const [packageValue, setPackageValue] = React.useState<number | "">("");
  const [cod, setCod] = React.useState(false);
  const [codAmount, setCodAmount] = React.useState<number | "">("");

  // Step 3 (Fiyat seçimi)
  const [selectedCarrier, setSelectedCarrier] = React.useState<string>("Kargoist");

  // Step 4 (Ödeme seçimi)
  const [deliveryOption, setDeliveryOption] = React.useState<"branch" | "pickup">("branch");

  function next() {
    setStep((s) => (s < 4 ? ((s + 1) as StepKey) : s));
  }
  function prev() {
    setStep((s) => (s > 1 ? ((s - 1) as StepKey) : s));
  }

  return (
    <div className="px-6 py-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-700">
          <IconBox className="h-4 w-4" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Kargo Oluştur</h1>
        <span className="text-neutral-400">ⓘ</span>
      </div>

      {/* Stepper */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {STEPS.map((s, idx) => {
            const done = s.n < step;
            const active = s.n === step;
            return (
              <div key={s.n} className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold",
                    done ? "bg-emerald-100 text-emerald-700" : active ? "bg-indigo-600 text-white" : "bg-neutral-100 text-neutral-400",
                  )}
                >
                  {done ? "✓" : s.n}
                </div>
                <div className={cn("text-sm font-semibold", active ? "text-neutral-900" : "text-neutral-400")}>{s.label}</div>
                {idx !== STEPS.length - 1 ? <div className="h-px w-10 bg-neutral-200" /> : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white">
        {step === 1 && (
          <div className="p-6">
            <SectionTitle title="Gönderim Yeri" />

            <div className="mt-4">
              <Label text="Gönderici Konumu Adı *" />
              <div className="relative">
                <input
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  ×
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3 text-sm text-neutral-600">
                <div className="h-5 w-9 rounded-full bg-neutral-200 relative">
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
                </div>
                Farklı bir adresten gönder
              </div>
            </div>

            <div className="mt-8 border-t border-neutral-200 pt-6">
              <SectionTitle title="Alıcı" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <Label text="Alıcının Tam Adı *" />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔎</span>
                  <input
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Tam adı girin veya kayıtlardan seçin"
                    className="h-10 w-full rounded-lg border border-neutral-200 px-10 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div>
                <Label text="Alıcı Telefon Numarası *" />
                <div className="flex gap-2">
                  <button type="button" className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
                    🇹🇷 ▼
                  </button>
                  <input
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="+90 ___ ___ ____"
                    className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Label text="Ülke *" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option>Türkiye</option>
              </select>
            </div>

            <div className="mt-4">
              <Label text="Tam Açık Adres *" />
              <textarea
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="Sorun yaşamamak için tam adres giriniz (Mahalle, Sokak, Bina no, İlçe, İl)"
                className="min-h-[90px] w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <Label text="Şehir *" />
                <select value={city} onChange={(e) => setCity(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="">Şehir</option>
                  <option>Ankara</option>
                  <option>İstanbul</option>
                  <option>Bursa</option>
                </select>
              </div>

              <div>
                <Label text="İlçe *" />
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="-"
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label text="Posta Kodu" />
              <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Posta Kodu" className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button onClick={next} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Paket Detayları <span className="opacity-90">›</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6">
            <div className="flex items-center justify-between">
              <SectionTitle title="Kutu Detayları" />
              <div className="text-sm text-neutral-500">
                <span className="font-semibold">Toplam Paket Sayısı</span> {boxes.length}{" "}
                <span className="mx-3 text-neutral-300">|</span>
                <span className="font-semibold">Toplam Ağırlık</span> {totalWeight} KG
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
              <div>
                <Label text="Kutu Seçin" />
                <div className="relative">
                  <input value="ambalaj" readOnly className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm" />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    ×
                  </button>
                </div>

                <div className="mt-4">
                  <Label text="Özel Kutu Boyutları" />
                  <input className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" placeholder="" />
                </div>

                <button
                  type="button"
                  onClick={() => setBoxes((b) => [...b, { l: 1, w: 1, h: 1, weight: 0 }])}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  + Yeni Kutu Ekle
                </button>
              </div>

              <div>
                <div className="space-y-3">
                  {boxes.map((bx, idx) => (
                    <div key={idx} className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_64px] items-center">
                      {/* dimensions */}
                      <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
                        <div className="text-xs font-semibold text-neutral-500">Kutu Boyutları *</div>
                        <div className="mt-2 grid grid-cols-7 items-center gap-2 text-sm">
                          <input
                            value={bx.l}
                            onChange={(e) => updateBox(idx, { l: num(e.target.value) })}
                            className="col-span-2 h-9 rounded-lg border border-neutral-200 px-2 outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <div className="text-center text-neutral-400">x</div>
                          <input
                            value={bx.w}
                            onChange={(e) => updateBox(idx, { w: num(e.target.value) })}
                            className="col-span-2 h-9 rounded-lg border border-neutral-200 px-2 outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <div className="text-center text-neutral-400">x</div>
                          <input
                            value={bx.h}
                            onChange={(e) => updateBox(idx, { h: num(e.target.value) })}
                            className="col-span-2 h-9 rounded-lg border border-neutral-200 px-2 outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <div className="col-span-7 text-right text-xs text-neutral-400">cm</div>
                        </div>
                      </div>

                      {/* weight */}
                      <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                          Ağırlık (kg) * <span className="text-neutral-400">ⓘ</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateBox(idx, { weight: Math.max(0, (bx.weight || 0) - 1) })}
                            className="h-9 w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                          >
                            −
                          </button>
                          <input
                            value={bx.weight}
                            onChange={(e) => updateBox(idx, { weight: num(e.target.value) })}
                            className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <div className="text-sm text-neutral-500">kg</div>
                          <button
                            type="button"
                            onClick={() => updateBox(idx, { weight: (bx.weight || 0) + 1 })}
                            className="h-9 w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* delete */}
                      <button
                        type="button"
                        onClick={() => setBoxes((b) => b.filter((_, i) => i !== idx))}
                        className="h-10 w-10 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                        title="Sil"
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-xs text-neutral-500 text-right">Kargo ücretinizin sonradan artmaması için doğru ağırlık giriniz.</div>
              </div>
            </div>

            <div className="mt-8 border-t border-neutral-200 pt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <Label text="Paket İçeriği *" />
                <input
                  value={packageContent}
                  onChange={(e) => setPackageContent(e.target.value)}
                  placeholder="Paket içeriğini belirtiniz."
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <Label text="Paket Değeri *" />
                <div className="flex items-center gap-2">
                  <input
                    value={packageValue}
                    onChange={(e) => setPackageValue(e.target.value === "" ? "" : num(e.target.value))}
                    placeholder="Paket değerini girin (ör. 500)"
                    className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <select className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
                    <option>TL</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-neutral-200 pt-6">
              <Label text="Kapıda ödeme mi? *" />
              <div className="mt-2 flex items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" checked={!cod} onChange={() => setCod(false)} />
                  Hayır
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" checked={cod} onChange={() => setCod(true)} />
                  Evet
                </label>
              </div>

              {cod && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div />
                  <div>
                    <Label text="Kapıda Ödeme Tutarı *" />
                    <div className="flex items-center gap-2">
                      <input
                        value={codAmount}
                        onChange={(e) => setCodAmount(e.target.value === "" ? "" : num(e.target.value))}
                        className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                      <div className="h-10 rounded-lg border border-neutral-200 bg-neutral-50 px-3 flex items-center text-sm text-neutral-600">
                        TL
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={prev} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
                ← Önceki
              </button>
              <button onClick={next} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Fiyatları Al <span className="opacity-90">›</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-6">
            {/* Summary header like screenshot */}
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="text-xs text-neutral-500">Sipariş Numarası</div>
                  <div className="font-semibold">OID-155298-1012</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Çıkış Noktası</div>
                  <div className="font-semibold">Bursa, TR</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Varış Noktası</div>
                  <div className="font-semibold">Ankara, TR</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Ödeme Türü</div>
                  <div className="font-semibold">{cod ? "Kapıda Ödeme" : "Ön Ödeme"}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Ücrete Esas Ağırlık</div>
                  <div className="font-semibold">{Math.max(1, totalWeight)} kg</div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
              {/* table header */}
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="grid grid-cols-[180px_100px_120px_160px_200px_120px_40px] gap-3 text-xs font-semibold text-neutral-600">
                  <div>Kargo Şirketi ⓘ</div>
                  <div>Hizmet Türü ⓘ</div>
                  <div>Teslimat Süresi ⓘ</div>
                  <div>Teslim Alma / Teslim Etme Koşulları ⓘ</div>
                  <div>Teslimat Türü ⓘ</div>
                  <div>Fiyat ⓘ</div>
                  <div />
                </div>

                <div className="mt-3 grid grid-cols-[180px_100px_120px_160px_200px_120px_40px] gap-3">
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
                  <select className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
                    <option>Seç</option>
                  </select>
                  <div className="flex gap-2">
                    <input className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm" placeholder="En az" />
                    <input className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm" placeholder="En fazla" />
                  </div>
                  <div />
                </div>
              </div>

              {/* rows */}
              <div className="divide-y divide-neutral-100">
                {MOCK_CARRIERS.map((r) => {
                  const active = r.name === selectedCarrier;
                  return (
                    <div key={r.name} className="px-4 py-4">
                      <div className="grid grid-cols-[180px_100px_120px_160px_200px_120px_40px] items-center gap-3 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-white flex items-center justify-center">
                            {CARRIER_LOGO[r.name] ? (
                              <img
                                src={CARRIER_LOGO[r.name]}
                                alt={`${r.name} logo`}
                                className="h-full w-full object-contain p-1"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-xs text-neutral-500">🏷️</span>
                            )}
                          </div>

                          <div className="font-semibold text-neutral-900">{r.name}</div>
                        </div>
                        <div className="text-neutral-700">{r.service}</div>
                        <div>
                          <span className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                            {r.eta}
                          </span>
                        </div>
                        <div className="text-neutral-700">
                          <div className="flex items-center gap-2">🏢 {r.pickup}</div>
                          <div className="flex items-center gap-2 mt-1 text-neutral-500">🚚 Adresten Alım</div>
                        </div>
                        <div className="text-neutral-700">🏁 {r.delivery}</div>
                        <div className="font-semibold text-neutral-900">{r.price}</div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedCarrier(r.name)}
                            className={cn(
                              "h-10 w-28 rounded-lg text-sm font-semibold transition",
                              active ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
                            )}
                          >
                            Seç
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={prev} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
                ← Önceki
              </button>
              <button onClick={next} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Devam <span className="opacity-90">›</span>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="p-6">
            <SectionTitle title="Kargo Gönderi Seçenekleri" />

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RadioCard
                title="Şubeden Teslim"
                badge="Önce En Hızlı"
                description="Kargo şirketinin size en yakın şubesine kargonuzu gün içinde bırakabilirsiniz."
                checked={deliveryOption === "branch"}
                onClick={() => setDeliveryOption("branch")}
              />
              <RadioCard
                title="Adresten Alım"
                description="Kargo şirketi kargonuzu sizden 1-2 gün içinde teslim alır."
                checked={deliveryOption === "pickup"}
                onClick={() => setDeliveryOption("pickup")}
              />
            </div>

            <div className="mt-6 border-t border-neutral-200 pt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                Önemli Bilgiler <span className="text-neutral-400">ⓘ</span>
              </div>

              <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
                <div className="font-semibold">1 &nbsp; DİKKAT - LÜTFEN OKUYUN</div>
                <p className="mt-2 text-neutral-600">
                  Siparişinizi düzgün ve sağlam şekilde paketlediğinize, paket boyut ve ağırlık bilgisini doğru girdiğinize emin olun.
                  İsterseniz kargo etiketini yazdırın ve kargo üzerine yapıştırın. (Mock metin)
                </p>

                <div className="mt-4 text-xs font-semibold text-neutral-700">Taşınması Yasaklı Ürünler</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600 space-y-1">
                  <li>Tehlikeli maddeler (yanıcı/patlayıcı vb.)</li>
                  <li>Uyuşturucu maddeler</li>
                  <li>Silah ve mühimmat</li>
                  <li>Canlı hayvan</li>
                  <li>vb. (mock)</li>
                </ul>
              </div>
            </div>

            {/* Price summary */}
            <div className="mt-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="font-semibold text-neutral-900">{selectedCarrier}</div>
                <div className="font-semibold text-neutral-900">₺ 156,00</div>
              </div>
              <div className="border-t border-neutral-200 px-5 py-3 text-sm text-neutral-700 flex items-center justify-between">
                <span>KDV Tutarı</span>
                <span>₺ 31,20</span>
              </div>
              <div className="border-t border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-900 flex items-center justify-between">
                <span>Toplam</span>
                <span>₺ 187,20</span>
              </div>
              <div className="border-t border-neutral-200 px-5 py-3 text-sm text-neutral-600">
                5196 ile biten kartınızdan <span className="font-semibold text-neutral-900">₺ 187,20</span> tutarında ücret alınacaktır.{" "}
                <Link href="__PATH_PAYMENT_METHODS__" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                  (Ödeme Yöntemini Göster)
                </Link>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={prev} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
                ← Önceki
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                // TODO: endpoint gelince submit
                onClick={() => alert("Mock: Gönderiyi Onayla")}
              >
                ✓ Gönderiyi Onayla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* küçük alt not */}
      <div className="mt-3 text-xs text-neutral-500">
        Not: Bu sayfa şimdilik UI mock. Endpointler gelince step validasyon + submit akışını bağlanacak.
      </div>
    </div>
  );

  function updateBox(i: number, patch: Partial<{ l: number; w: number; h: number; weight: number }>) {
    setBoxes((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
}

function Label({ text }: { text: string }) {
  return <div className="mb-2 text-sm font-semibold text-neutral-800">{text}</div>;
}

function SectionTitle({ title }: { title: string }) {
  return <div className="text-sm font-semibold text-neutral-900">{title}</div>;
}

function num(v: string) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function RadioCard({
  title,
  description,
  badge,
  checked,
  onClick,
}: {
  title: string;
  description: string;
  badge?: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition",
        checked ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200" : "border-neutral-200 bg-white hover:bg-neutral-50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center">🚚</div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-neutral-900">{title}</div>
              {badge ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{badge}</span> : null}
            </div>
            <div className="mt-1 text-sm text-neutral-600">{description}</div>
          </div>
        </div>

        <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", checked ? "border-indigo-600" : "border-neutral-300")}>
          {checked ? <div className="h-2 w-2 rounded-full bg-indigo-600" /> : null}
        </div>
      </div>
    </button>
  );
}
