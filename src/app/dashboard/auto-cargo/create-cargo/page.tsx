//src/app/dashboard/auto-cargo/create-cargo/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";
import CreditTopUpModal from "@/src/components/credit/CreditTopUpModal";
import CreditChip from "@/src/components/credit/CreditChip";

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function fmtOrderDate(d: Date) {
  // "31/12/2022 15:45"
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fmtDateOnly(d: Date) {
  // "31/12/2020"
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/* ================= Stepper ================= */

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

/* ================= API Types ================= */

type CreateOrderCustomer = {
  name: string;
  email: string;
  mobile: string;
  address: string;
  district: string;
  city: string;
  country: string; // "TR"
  postcode: string;
  lat: string;
  lon: string;
};

type CreateOrderItem = {
  productId?: number;
  name: string;
  price: number;
  rowTotal?: number;
  taxAmount?: number;
  quantity: number;
  sku: string;
  image?: string;
};

type CreateOrderReq = {
  order_id: string;
  pickupLocationCode: string;
  createShipment: string; // swagger örneğinde "true" string
  deliveryOptionId: number;

  payment_method: "paid" | "cod";
  amount: number;
  amount_due: number;
  currency: string;

  customsValue: string;
  customsCurrency: string;

  packageCount: number;
  packageWeight: number;
  boxWidth: number;
  boxLength: number;
  boxHeight: number;

  orderDate: string; // "31/12/2022 15:45"
  deliverySlotDate: string; // "31/12/2020"
  deliverySlotTo: string; // "12pm"
  deliverySlotFrom: string; // "2:30pm"

  senderName: string;

  customer: CreateOrderCustomer;
  items: CreateOrderItem[];
};

type CreateOrderRes = {
  success: boolean;
  message: string | null;
  warnings: any;
  otoErrorCode: string | null;
  otoErrorMessage: string | null;
  otoId: number | null;
  otoIds: any;
};

// Cities endpoint response (senin attığın format)
type CitiesRes = {
  success?: boolean;
  message?: any;
  otoErrorCode?: any;
  otoErrorMessage?: any;
  getCities?: {
    totalCount?: number;
    perPage?: number;
    Cities?: Array<{ name: string }>;
  };
};

/* ================= Page ================= */

export default function CreateCargoPage() {
  const router = useRouter();

  const [step, setStep] = React.useState<StepKey>(1);

  // api state
  const [submitting, setSubmitting] = React.useState(false);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [lastRes, setLastRes] = React.useState<CreateOrderRes | null>(null);

  // ========== CREDIT (UI: resim 1-2, endpoint: resim 3) ==========
  // (Backend'te gerçek bakiye endpoint'i yoksa UI statik kalsın)
  const [creditBalance] = React.useState<number>(0);
  const [creditOpen, setCreditOpen] = React.useState(false);

  // ========== STEP 1 (Cargo UI) ==========
  const [pickupLocationCode, setPickupLocationCode] = React.useState("jdd_wh");
  const [useDifferentSender, setUseDifferentSender] = React.useState(false);

  // Receiver
  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState("");
  const [receiverEmail, setReceiverEmail] = React.useState("");

  // Address
  // ✅ ülke otomatik TR (kilitli)
  const [country, setCountry] = React.useState("TR");
  const [fullAddress, setFullAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [zip, setZip] = React.useState("");

  // ✅ şehir listesini endpoint'ten al
  const [cityOptions, setCityOptions] = React.useState<string[]>([]);
  const [cityLoading, setCityLoading] = React.useState(false);
  const [cityLoadErr, setCityLoadErr] = React.useState<string | null>(null);

  // extra required fields
  const [lat, setLat] = React.useState("");
  const [lon, setLon] = React.useState("");
  const [refId, setRefId] = React.useState("");

  // ========== STEP 2 ==========
  const [boxes, setBoxes] = React.useState<Array<{ l: number; w: number; h: number; weight: number }>>([
    { l: 10, w: 10, h: 10, weight: 1 },
    { l: 10, w: 10, h: 10, weight: 1 },
  ]);

  const totalWeight = boxes.reduce((a, b) => a + (Number.isFinite(b.weight) ? b.weight : 0), 0);
  const packageCount = boxes.length;

  // API tek set ölçü alıyor: 1. kutuyu basıyoruz
  const boxWidth = Math.max(0, Math.round(boxes[0]?.w ?? 0));
  const boxLength = Math.max(0, Math.round(boxes[0]?.l ?? 0));
  const boxHeight = Math.max(0, Math.round(boxes[0]?.h ?? 0));
  const packageWeight = Math.max(0, totalWeight);

  const [packageContent, setPackageContent] = React.useState("");
  const [packageValue, setPackageValue] = React.useState<number | "">("");

  const [cod, setCod] = React.useState(false);
  const [codAmount, setCodAmount] = React.useState<number | "">("");

  // ========== STEP 3 ==========
  const [selectedCarrierName, setSelectedCarrierName] = React.useState<string>("");
  const [selectedPrice, setSelectedPrice] = React.useState<number | "">("");

  // ========== STEP 4 ==========
  const [senderName, setSenderName] = React.useState("Sender Company");
  const [orderId, setOrderId] = React.useState("1234");
  const [deliveryOptionId, setDeliveryOptionId] = React.useState<number | "">(564);
  const [createShipment, setCreateShipment] = React.useState(true);

  const [currency, setCurrency] = React.useState("SAR");
  const [customsValue, setCustomsValue] = React.useState("12");
  const [customsCurrency, setCustomsCurrency] = React.useState("USD");

  const [orderDate, setOrderDate] = React.useState<string>(() => fmtOrderDate(new Date()));
  const [deliverySlotDate, setDeliverySlotDate] = React.useState<string>(() => fmtDateOnly(new Date()));
  const [deliverySlotFrom, setDeliverySlotFrom] = React.useState("2:30pm");
  const [deliverySlotTo, setDeliverySlotTo] = React.useState("12pm");

  // ✅ ülkeyi zorla TR tut
  React.useEffect(() => {
    if (country !== "TR") setCountry("TR");
  }, [country]);

  // ✅ Şehirleri çek: /api/oto/logistics/cities?country=TR
  React.useEffect(() => {
    let alive = true;

    async function loadCities() {
      setCityLoadErr(null);
      setCityLoading(true);

      const bearer = getBearerToken();
      if (!bearer) {
        setCityLoading(false);
        router.replace("/");
        return;
      }

      try {
        const res = await fetch(`/yuksi/oto/logistics/cities?country=${encodeURIComponent(country)}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${bearer}`,
          },
        });

        const json = await readJson<CitiesRes>(res);

        if (res.status === 401 || res.status === 403) {
          router.replace("/");
          return;
        }
        if (!res.ok) {
          throw new Error(pickMsg(json, `HTTP ${res.status}`));
        }

        const names = json?.getCities?.Cities?.map((x) => String(x?.name || "").trim()).filter(Boolean) || [];

        if (!alive) return;

        setCityOptions(names);

        if (city && !names.includes(city)) setCity("");
      } catch (e: any) {
        if (!alive) return;
        setCityOptions([]);
        setCityLoadErr(e?.message || "Şehir listesi alınamadı.");
      } finally {
        if (!alive) return;
        setCityLoading(false);
      }
    }

    loadCities();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  function updateBox(i: number, patch: Partial<{ l: number; w: number; h: number; weight: number }>) {
    setBoxes((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function next() {
    setErrMsg(null);
    setOkMsg(null);
    setStep((s) => (s < 4 ? ((s + 1) as StepKey) : s));
  }
  function prev() {
    setErrMsg(null);
    setOkMsg(null);
    setStep((s) => (s > 1 ? ((s - 1) as StepKey) : s));
  }

  function validateStep(s: StepKey): string | null {
    if (s === 1) {
      if (!pickupLocationCode.trim()) return "Gönderici Konumu Adı zorunlu.";
      if (!receiverName.trim()) return "Alıcının Tam Adı zorunlu.";
      if (!receiverPhone.trim()) return "Alıcı Telefon Numarası zorunlu.";
      if (!country.trim()) return "Ülke zorunlu.";
      if (!fullAddress.trim()) return "Tam Açık Adres zorunlu.";
      if (!city.trim()) return "Şehir zorunlu.";
      if (!district.trim()) return "İlçe zorunlu.";

      if (!receiverEmail.trim()) return "Alıcı e-posta (customer.email) zorunlu.";
      if (!zip.trim()) return "Posta kodu (customer.postcode) zorunlu.";
      if (!lat.trim()) return "Lat (customer.lat) zorunlu.";
      if (!lon.trim()) return "Lon (customer.lon) zorunlu.";

      if (cityLoading) return "Şehir listesi yükleniyor, lütfen bekleyin.";
      if (cityLoadErr) return `Şehir listesi hatası: ${cityLoadErr}`;
    }

    if (s === 2) {
      if (boxes.length < 1) return "En az 1 kutu olmalı.";
      if (!(boxWidth > 0 && boxLength > 0 && boxHeight > 0)) return "Kutu ölçüleri 0 olamaz.";
      if (!(packageWeight > 0)) return "Toplam ağırlık 0 olamaz.";
      if (!packageContent.trim()) return "Paket içeriği zorunlu.";
      if (packageValue === "" || !(Number(packageValue) > 0)) return "Paket değeri zorunlu.";
      if (cod) {
        if (codAmount === "" || !(Number(codAmount) > 0)) return "Kapıda ödeme tutarı zorunlu.";
      }
    }

    if (s === 3) return null;

    if (s === 4) {
      if (!senderName.trim()) return "senderName zorunlu.";
      if (!orderId.trim()) return "order_id zorunlu.";
      if (deliveryOptionId === "" || !(Number(deliveryOptionId) > 0)) return "deliveryOptionId zorunlu.";
      if (!currency.trim()) return "currency zorunlu.";
      if (!customsValue.trim()) return "customsValue zorunlu.";
      if (!customsCurrency.trim()) return "customsCurrency zorunlu.";
      if (!orderDate.trim()) return "orderDate zorunlu.";
      if (!deliverySlotDate.trim()) return "deliverySlotDate zorunlu.";
      if (!deliverySlotFrom.trim()) return "deliverySlotFrom zorunlu.";
      if (!deliverySlotTo.trim()) return "deliverySlotTo zorunlu.";
    }

    return null;
  }

  async function submit() {
    setErrMsg(null);
    setOkMsg(null);
    setLastRes(null);

    for (const s of [1, 2, 3, 4] as StepKey[]) {
      const v = validateStep(s);
      if (v) {
        setErrMsg(v);
        setStep(s);
        return;
      }
    }

    const bearer = getBearerToken();
    if (!bearer) {
      router.replace("/");
      return;
    }

    const payment_method: "paid" | "cod" = cod ? "cod" : "paid";

    const baseAmount = selectedPrice !== "" ? Number(selectedPrice) : packageValue !== "" ? Number(packageValue) : 0;
    const amount = Math.max(0, baseAmount);
    const amount_due = payment_method === "cod" ? Math.max(0, Number(codAmount || 0)) : 0;

    const items: CreateOrderItem[] = [
      {
        name: packageContent.trim(),
        price: Math.max(0, Number(packageValue || 0)),
        quantity: 1,
        sku: `pkg-${orderId.trim() || "order"}`,
      },
    ];

    const body: CreateOrderReq = {
      order_id: orderId.trim(),
      pickupLocationCode: pickupLocationCode.trim(),
      createShipment: createShipment ? "true" : "false",
      deliveryOptionId: Number(deliveryOptionId),

      payment_method,
      amount,
      amount_due,
      currency: currency.trim(),

      customsValue: customsValue.trim(),
      customsCurrency: customsCurrency.trim(),

      packageCount,
      packageWeight,
      boxWidth,
      boxLength,
      boxHeight,

      orderDate: orderDate.trim(),
      deliverySlotDate: deliverySlotDate.trim(),
      deliverySlotTo: deliverySlotTo.trim(),
      deliverySlotFrom: deliverySlotFrom.trim(),

      senderName: senderName.trim(),

      customer: {
        name: receiverName.trim(),
        email: receiverEmail.trim(),
        mobile: receiverPhone.trim(),
        address: fullAddress.trim(),
        district: district.trim(),
        city: city.trim(),
        country: country.trim(),
        postcode: zip.trim(),
        lat: lat.trim(),
        lon: lon.trim(),
      },
      items,
    };

    setSubmitting(true);
    try {
      // ✅ user_id kaldırıldı: backend token'dan alıyor
      const url = `/yuksi/oto/orders/create`;

      const res = await fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(body),
      });

      const json = await readJson<CreateOrderRes>(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(pickMsg(json, `HTTP ${res.status}`));
      }

      setLastRes(json);

      if (json?.success) {
        const msg = json?.otoId ? `Order created. otoId=${json.otoId}` : "Order created.";
        setOkMsg(msg);
      } else {
        setErrMsg(json?.otoErrorMessage || json?.message || "Order create başarısız.");
      }
    } catch (e: any) {
      setErrMsg(e?.message || "Order create çağrısı başarısız.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-700">
            <IconBox className="h-4 w-4" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Kargo Oluştur</h1>
          <span className="text-neutral-400">ⓘ</span>
        </div>

        <CreditChip creditBalance={creditBalance} onTopUp={() => setCreditOpen(true)} />
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
                    done ? "bg-emerald-100 text-emerald-700" : active ? "bg-indigo-600 text-white" : "bg-neutral-100 text-neutral-400"
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
        {/* STEP 1 */}
        {step === 1 && (
          <div className="p-6">
            <SectionTitle title="Gönderim Yeri" />

            <div className="mt-4">
              <Label text="Gönderici Konumu Adı *" />
              <div className="relative">
                <input
                  value={pickupLocationCode}
                  onChange={(e) => setPickupLocationCode(e.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <button
                  type="button"
                  onClick={() => setPickupLocationCode("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  title="Temizle"
                >
                  ×
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3 text-sm text-neutral-600">
                <button
                  type="button"
                  onClick={() => setUseDifferentSender((p) => !p)}
                  className={cn(
                    "h-5 w-9 rounded-full relative transition border",
                    useDifferentSender ? "bg-indigo-600 border-indigo-600" : "bg-neutral-200 border-neutral-200"
                  )}
                  aria-label="Farklı adresten gönder"
                >
                  <div
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                      useDifferentSender ? "left-4.5" : "left-0.5"
                    )}
                  />
                </button>
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
                    🌍 ▼
                  </button>
                  <input
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="+__ ___ ___ ____"
                    className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <Label text="Alıcı E-posta *" />
                <input
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  placeholder="test@test.com"
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            {/* Ülke otomatik TR */}
            <div className="mt-4">
              <Label text="Ülke *" />
              <input value={country} readOnly className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700" />
              <div className="mt-1 text-xs text-neutral-500">
                Ülke otomatik <span className="font-mono">TR</span> olarak setlenir.
              </div>
            </div>

            <div className="mt-4">
              <Label text="Tam Açık Adres *" />
              <textarea
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="Mahalle, Sokak, Bina no, İlçe, İl"
                className="min-h-[90px] w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Şehir endpoint'e bağlı */}
              <div>
                <Label text="Şehir *" />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={cityLoading || !!cityLoadErr}
                  className={cn(
                    "h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200",
                    cityLoading || cityLoadErr ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"
                  )}
                >
                  <option value="">{cityLoading ? "Şehirler yükleniyor..." : "Şehir seçin"}</option>
                  {cityOptions.map((nm) => (
                    <option key={nm} value={nm}>
                      {nm}
                    </option>
                  ))}
                </select>

                {cityLoadErr ? <div className="mt-2 text-xs text-rose-600">Şehirler alınamadı: {cityLoadErr}</div> : null}
              </div>

              <div>
                <Label text="İlçe *" />
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="İlçe"
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div>
                <Label text="Posta Kodu *" />
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="06000"
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <Label text="Lat *" />
                <input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="40.706333"
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <Label text="Lon *" />
                <input
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="29.888211"
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button
                onClick={() => {
                  const v = validateStep(1);
                  if (v) return setErrMsg(v);
                  next();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Paket Detayları <span className="opacity-90">›</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="p-6">
            <div className="flex items-center justify-between">
              <SectionTitle title="Kutu Detayları" />
              <div className="text-sm text-neutral-500">
                <span className="font-semibold">Toplam Paket Sayısı</span> {boxes.length}{" "}
                <span className="mx-3 text-neutral-300">|</span>
                <span className="font-semibold">Toplam Ağırlık</span> {packageWeight} KG
              </div>
            </div>

            <div className="mt-4 space-y-3">
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

            <button
              type="button"
              onClick={() => setBoxes((b) => [...b, { l: 10, w: 10, h: 10, weight: 1 }])}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              + Yeni Kutu Ekle
            </button>

            <div className="mt-2 text-xs text-neutral-500">API tek set boxWidth/boxLength/boxHeight alıyor. Şimdilik 1. kutunun ölçülerini gönderiyoruz.</div>

            <div className="mt-8 border-t border-neutral-200 pt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="lg:col-span-1">
                <Label text="Paket İçeriği *" />
                <input
                  value={packageContent}
                  onChange={(e) => setPackageContent(e.target.value)}
                  placeholder="Paket içeriğini belirtiniz."
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="lg:col-span-1">
                <Label text="Paket Değeri *" />
                <div className="flex items-center gap-2">
                  <input
                    value={packageValue}
                    onChange={(e) => setPackageValue(e.target.value === "" ? "" : num(e.target.value))}
                    placeholder="250"
                    className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="TRY">TRY</option>
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
                      <div className="h-10 rounded-lg border border-neutral-200 bg-neutral-50 px-3 flex items-center text-sm text-neutral-600">{currency}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={prev} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
                ← Önceki
              </button>
              <button
                onClick={() => {
                  const v = validateStep(2);
                  if (v) return setErrMsg(v);
                  next();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Fiyatları Al <span className="opacity-90">›</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="p-6">
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="text-xs text-neutral-500">Sipariş Numarası</div>
                  <div className="font-semibold">{orderId || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Varış Noktası</div>
                  <div className="font-semibold">{city || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Ödeme Türü</div>
                  <div className="font-semibold">{cod ? "Kapıda Ödeme" : "Ödendi"}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Ücrete Esas Ağırlık</div>
                  <div className="font-semibold">{Math.max(1, packageWeight)} kg</div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
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

              <div className="p-6 text-sm text-neutral-600">
                Şu an bu ekrana fiyat listesi bağlanmadı (mock kaldırıldı). Eğer “rate/quote” endpoint’i varsa ver, Step 3’te gerçek kargo şirketlerini ve fiyatlarını buraya çekeriz.
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <Label text="Seçili Kargo Şirketi (opsiyonel)" />
                    <input
                      value={selectedCarrierName}
                      onChange={(e) => setSelectedCarrierName(e.target.value)}
                      placeholder="Sürat Kargo"
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <Label text="Seçili Fiyat (opsiyonel)" />
                    <input
                      value={selectedPrice}
                      onChange={(e) => setSelectedPrice(e.target.value === "" ? "" : num(e.target.value))}
                      placeholder="153"
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={prev} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
                ← Önceki
              </button>
              <button onClick={() => next()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Devam <span className="opacity-90">›</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="p-6">
            <SectionTitle title="Ödeme Onay" />

            <div className="mt-4 border border-neutral-200 rounded-lg bg-white p-4 text-sm text-neutral-700">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                Önemli Bilgiler <span className="text-neutral-400">ⓘ</span>
              </div>

              <div className="mt-3 text-sm text-neutral-600">
                Siparişinizi düzgün ve sağlam şekilde paketlediğinize, paket boyut ve ağırlık bilgisini doğru girdiğinize emin olun. İsterseniz kargo etiketini yazdırın ve kargo üzerine yapıştırın.
              </div>

              <div className="mt-4 text-xs font-semibold text-neutral-700">Taşınması Yasaklı Ürünler</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600 space-y-1">
                <li>Tehlikeli maddeler (yanıcı/patlayıcı vb.)</li>
                <li>Uyuşturucu maddeler</li>
                <li>Silah ve mühimmat</li>
                <li>Canlı hayvan</li>
              </ul>
            </div>

            <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-900">Sipariş Parametreleri (API)</div>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <Label text="senderName *" />
                  <input value={senderName} onChange={(e) => setSenderName(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <Label text="order_id *" />
                  <input value={orderId} onChange={(e) => setOrderId(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label text="deliveryOptionId *" />
                    <input
                      value={deliveryOptionId}
                      onChange={(e) => setDeliveryOptionId(e.target.value === "" ? "" : num(e.target.value))}
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 mt-8">
                    <input checked={createShipment} onChange={(e) => setCreateShipment(e.target.checked)} type="checkbox" />
                    createShipment
                  </label>
                </div>

                <div>
                  <Label text="customsValue *" />
                  <input value={customsValue} onChange={(e) => setCustomsValue(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <Label text="customsCurrency *" />
                  <input value={customsCurrency} onChange={(e) => setCustomsCurrency(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>

                <div>
                  <Label text="orderDate * (dd/mm/yyyy HH:MM)" />
                  <input value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <Label text="deliverySlotDate * (dd/mm/yyyy)" />
                  <input value={deliverySlotDate} onChange={(e) => setDeliverySlotDate(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>

                <div>
                  <Label text="deliverySlotFrom *" />
                  <input value={deliverySlotFrom} onChange={(e) => setDeliverySlotFrom(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <Label text="deliverySlotTo *" />
                  <input value={deliverySlotTo} onChange={(e) => setDeliverySlotTo(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="font-semibold text-neutral-900">{selectedCarrierName || "Seçili Kargo"}</div>
                <div className="font-semibold text-neutral-900">{selectedPrice !== "" ? `${selectedPrice} ${currency}` : `${packageValue || 0} ${currency}`}</div>
              </div>
              <div className="border-t border-neutral-200 px-5 py-3 text-sm text-neutral-700 flex items-center justify-between">
                <span>Ödeme Türü</span>
                <span>{cod ? "Kapıda Ödeme" : "Ödendi"}</span>
              </div>
              <div className="border-t border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-900 flex items-center justify-between">
                <span>Toplam</span>
                <span>{selectedPrice !== "" ? `${selectedPrice} ${currency}` : `${packageValue || 0} ${currency}`}</span>
              </div>
              <div className="border-t border-neutral-200 px-5 py-3 text-sm text-neutral-600">
                <Link href="__PATH_PAYMENT_METHODS__" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                  Ödeme Yöntemini Göster
                </Link>
              </div>
            </div>

            {lastRes ? (
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-sm font-semibold text-neutral-900">API Response</div>
                <pre className="mt-2 overflow-auto rounded-lg bg-white p-3 text-xs text-neutral-800 border border-neutral-200">{JSON.stringify(lastRes, null, 2)}</pre>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between">
              <button onClick={prev} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
                ← Önceki
              </button>
              <button
                type="button"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={submit}
              >
                {submitting ? "Gönderiliyor…" : "✓ Gönderiyi Onayla"}
              </button>
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              Endpoint: <span className="font-mono">/oto/orders/create</span>
            </div>
          </div>
        )}
      </div>
      <CreditTopUpModal open={creditOpen} onOpenChange={setCreditOpen} creditBalance={creditBalance} />
    </div>
  );

}

/* ================= UI bits ================= */

function Label({ text }: { text: string }) {
  return <div className="mb-2 text-sm font-semibold text-neutral-800">{text}</div>;
}

function SectionTitle({ title }: { title: string }) {
  return <div className="text-sm font-semibold text-neutral-900">{title}</div>;
}
