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
  district: string; // ilçe
  city: string; // il
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
  createShipment: string;
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

  orderDate: string;
  deliverySlotDate: string;
  deliverySlotTo: string;
  deliverySlotFrom: string;

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

/* ===== Logistics Types (countries/states/cities) ===== */

type LogisticsCountry = {
  id: number;
  name: string;
  iso2?: string;
  iso3?: string;
  phonecode?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type LogisticsState = {
  id: number;
  name: string;
  country_id: number;
  country_code?: string;
  state_code?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type LogisticsCity = {
  id: number;
  name: string;
  state_id: number;
  state_code?: string;
  country_id: number;
  country_code?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type LogisticsRes<T> = {
  success: boolean;
  message?: any;
  data?: T[];
  error?: any;
  detail?: any;
  title?: any;
};

/* ===== Inventory Box Types (Swagger ekranındaki) ===== */

type InventoryBox = {
  id: number;
  boxName: string;
  length: number;
  width: number;
  height: number;
};

type GetBoxesRes = {
  success: boolean;
  message: any;
  warnings: any;
  otoErrorCode: any;
  otoErrorMessage: any;
  boxes?: InventoryBox[];
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

  // ========== CREDIT ==========
  const [creditBalance] = React.useState<number>(0);
  const [creditOpen, setCreditOpen] = React.useState(false);

  // ========== STEP 1 ==========
  const [pickupLocationCode, setPickupLocationCode] = React.useState("jdd_wh");
  const [useDifferentSender, setUseDifferentSender] = React.useState(false);

  // Receiver
  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState("");
  const [receiverEmail, setReceiverEmail] = React.useState("");

  // Address
  const [fullAddress, setFullAddress] = React.useState("");
  const [zip, setZip] = React.useState("");

  // Logistics selects (country/il/ilçe)
  const [countries, setCountries] = React.useState<LogisticsCountry[]>([]);
  const [states, setStates] = React.useState<LogisticsState[]>([]);
  const [cities, setCities] = React.useState<LogisticsCity[]>([]);

  const [countryId, setCountryId] = React.useState<number | "">("");
  const [stateId, setStateId] = React.useState<number | "">("");
  const [cityId, setCityId] = React.useState<number | "">("");

  // payload strings
  const [countryCode, setCountryCode] = React.useState("TR"); // backend payload (customer.country)
  const [cityName, setCityName] = React.useState(""); // il (customer.city)
  const [districtName, setDistrictName] = React.useState(""); // ilçe (customer.district)

  // lat/lon (AUTO, hidden)
  const [lat, setLat] = React.useState("");
  const [lon, setLon] = React.useState("");

  // Debug: lat/lon kontrol alanı (sonra silebilirsin)
  const [showLatLonDebug, setShowLatLonDebug] = React.useState(false);

  // ========== STEP 2 ==========
  const [boxes, setBoxes] = React.useState<Array<{ boxId: number | ""; weight: number }>>([
    { boxId: "", weight: 1 },
    { boxId: "", weight: 1 },
  ]);

  const [invBoxes, setInvBoxes] = React.useState<InventoryBox[]>([]);
  const [invLoading, setInvLoading] = React.useState(false);
  const [invErr, setInvErr] = React.useState<string | null>(null);

  const [addBoxOpen, setAddBoxOpen] = React.useState(false);
  const [addBoxSubmitting, setAddBoxSubmitting] = React.useState(false);
  const [newBoxName, setNewBoxName] = React.useState("");
  const [newBoxL, setNewBoxL] = React.useState<number | "">(10);
  const [newBoxW, setNewBoxW] = React.useState<number | "">(10);
  const [newBoxH, setNewBoxH] = React.useState<number | "">(10);

  const totalWeight = boxes.reduce((a, b) => a + (Number.isFinite(b.weight) ? b.weight : 0), 0);
  const packageCount = boxes.length;

  const selectedFirstBox = React.useMemo(() => {
    const firstId = boxes[0]?.boxId;
    if (!firstId) return null;
    return invBoxes.find((b) => b.id === Number(firstId)) || null;
  }, [boxes, invBoxes]);

  const boxWidth = Math.max(0, Math.round(selectedFirstBox?.width ?? 0));
  const boxLength = Math.max(0, Math.round(selectedFirstBox?.length ?? 0));
  const boxHeight = Math.max(0, Math.round(selectedFirstBox?.height ?? 0));
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

  /* ================= Logistics Loaders ================= */

  const loadCountries = React.useCallback(async () => {
    const bearer = getBearerToken();
    if (!bearer) {
      router.replace("/");
      return;
    }

    try {
      const res = await fetch(`/yuksi/logistics/countries?limit=5000&offset=0`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json", Authorization: `Bearer ${bearer}` },
      });

      const json = await readJson<LogisticsRes<LogisticsCountry>>(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      const list = Array.isArray(json?.data) ? json.data : [];
      setCountries(list);

      // Default: TR varsa onu seç
      const tr =
        list.find((c) => String(c?.iso2 || "").toUpperCase() === "TR") ||
        list.find((c) => String(c?.name || "").toLowerCase() === "turkey") ||
        list[0];

      if (tr?.id) {
        setCountryId(tr.id);
        setCountryCode(String(tr.iso2 || "TR").toUpperCase() || "TR");
      }
    } catch (e: any) {
      setCountries([]);
      setCountryId("");
      setStates([]);
      setStateId("");
      setCities([]);
      setCityId("");
      setCityName("");
      setDistrictName("");
      setLat("");
      setLon("");
      setErrMsg(e?.message || "Ülke listesi alınamadı.");
    }
  }, [router]);

  const loadStates = React.useCallback(
    async (cid: number) => {
      const bearer = getBearerToken();
      if (!bearer) {
        router.replace("/");
        return;
      }

      try {
        const res = await fetch(`/yuksi/logistics/states?country_id=${encodeURIComponent(String(cid))}&limit=5000&offset=0`, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json", Authorization: `Bearer ${bearer}` },
        });

        const json = await readJson<LogisticsRes<LogisticsState>>(res);

        if (res.status === 401 || res.status === 403) {
          router.replace("/");
          return;
        }
        if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

        const list = Array.isArray(json?.data) ? json.data : [];
        setStates(list);

        // reset dependent
        setStateId("");
        setCities([]);
        setCityId("");
        setCityName("");
        setDistrictName("");
        setLat("");
        setLon("");
      } catch (e: any) {
        setStates([]);
        setStateId("");
        setCities([]);
        setCityId("");
        setCityName("");
        setDistrictName("");
        setLat("");
        setLon("");
        setErrMsg(e?.message || "İl listesi alınamadı.");
      }
    },
    [router]
  );

  const loadCities = React.useCallback(
    async (cid: number, sid: number) => {
      const bearer = getBearerToken();
      if (!bearer) {
        router.replace("/");
        return;
      }

      try {
        const res = await fetch(
          `/yuksi/logistics/cities?country_id=${encodeURIComponent(String(cid))}&state_id=${encodeURIComponent(String(sid))}&limit=5000&offset=0`,
          {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json", Authorization: `Bearer ${bearer}` },
          }
        );

        const json = await readJson<LogisticsRes<LogisticsCity>>(res);

        if (res.status === 401 || res.status === 403) {
          router.replace("/");
          return;
        }
        if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

        const list = Array.isArray(json?.data) ? json.data : [];
        setCities(list);

        // reset district/city selection
        setCityId("");
        setDistrictName("");
        setLat("");
        setLon("");
      } catch (e: any) {
        setCities([]);
        setCityId("");
        setDistrictName("");
        setLat("");
        setLon("");
        setErrMsg(e?.message || "İlçe listesi alınamadı.");
      }
    },
    [router]
  );

  // initial: countries
  React.useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  // when country changes: load states
  React.useEffect(() => {
    if (!countryId) return;
    loadStates(Number(countryId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId]);

  // when state changes: set cityName + load cities
  React.useEffect(() => {
    if (!countryId || !stateId) return;

    const st = states.find((s) => s.id === Number(stateId));
    setCityName(st ? String(st.name || "").trim() : "");

    loadCities(Number(countryId), Number(stateId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateId]);

  // when city (district) changes: set districtName + lat/lon
  React.useEffect(() => {
    if (!cityId) {
      setDistrictName("");
      setLat("");
      setLon("");
      return;
    }

    const ct = cities.find((c) => c.id === Number(cityId));
    const dName = ct ? String(ct.name || "").trim() : "";
    setDistrictName(dName);

    const la = ct?.latitude ?? "";
    const lo = ct?.longitude ?? "";
    setLat(la === null || la === undefined ? "" : String(la));
    setLon(lo === null || lo === undefined ? "" : String(lo));
  }, [cityId, cities]);

  /* ================= Inventory: GET /oto/inventory/box ================= */

  const loadInventoryBoxes = React.useCallback(async () => {
    setInvErr(null);
    setInvLoading(true);

    const bearer = getBearerToken();
    if (!bearer) {
      setInvLoading(false);
      router.replace("/");
      return;
    }

    try {
      const res = await fetch(`/yuksi/oto/inventory/box`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${bearer}`,
        },
      });

      const json = await readJson<GetBoxesRes>(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      const list = Array.isArray(json?.boxes) ? json.boxes : [];
      setInvBoxes(list);

      setBoxes((prev) =>
        prev.map((p) => {
          if (!p.boxId) return p;
          const ok = list.some((b) => b.id === Number(p.boxId));
          return ok ? p : { ...p, boxId: "" };
        })
      );
    } catch (e: any) {
      setInvBoxes([]);
      setInvErr(e?.message || "Kutu listesi alınamadı.");
    } finally {
      setInvLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    loadInventoryBoxes();
  }, [loadInventoryBoxes]);

  /* ================= Inventory: POST /oto/inventory/add-box ================= */

  async function addInventoryBox() {
    setAddBoxSubmitting(true);
    setInvErr(null);

    const bearer = getBearerToken();
    if (!bearer) {
      setAddBoxSubmitting(false);
      router.replace("/");
      return;
    }

    try {
      const name = String(newBoxName || "").trim();
      const length = Number(newBoxL || 0);
      const width = Number(newBoxW || 0);
      const height = Number(newBoxH || 0);

      if (!name) throw new Error("Kutu adı (name) zorunlu.");
      if (!(length > 0 && width > 0 && height > 0)) throw new Error("Kutu ölçüleri 0 olamaz.");

      const res = await fetch(`/yuksi/oto/inventory/add-box`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify({
          name,
          length,
          width,
          height,
        }),
      });

      const json: any = await readJson(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      if (json?.success !== true) throw new Error(pickMsg(json, "Kutu eklenemedi."));

      await loadInventoryBoxes();

      setAddBoxOpen(false);
      setNewBoxName("");
      setNewBoxL(10);
      setNewBoxW(10);
      setNewBoxH(10);
    } catch (e: any) {
      setInvErr(e?.message || "Kutu ekleme başarısız.");
    } finally {
      setAddBoxSubmitting(false);
    }
  }

  function updateBox(i: number, patch: Partial<{ boxId: number | ""; weight: number }>) {
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
      if (!receiverEmail.trim()) return "Alıcı e-posta (customer.email) zorunlu.";

      if (!countryId) return "Ülke seçimi zorunlu.";
      if (!stateId) return "İl seçimi zorunlu.";
      if (!cityId) return "İlçe seçimi zorunlu.";

      if (!fullAddress.trim()) return "Tam Açık Adres zorunlu.";
      if (!zip.trim()) return "Posta kodu (customer.postcode) zorunlu.";

      // lat/lon görünmüyor ama payload için dolu olmalı
      if (!lat.trim() || !lon.trim()) return "Lat/Lon otomatik dolmadı. İlçe seçimini kontrol et.";
    }

    if (s === 2) {
      if (boxes.length < 1) return "En az 1 kutu olmalı.";
      if (!boxes[0]?.boxId) return "En az 1 kutu tipi seçmelisin (ilk satır).";
      if (!(boxWidth > 0 && boxLength > 0 && boxHeight > 0)) return "Seçili kutunun ölçüleri 0 olamaz.";
      if (!(packageWeight > 0)) return "Toplam ağırlık 0 olamaz.";
      if (!packageContent.trim()) return "Paket içeriği zorunlu.";
      if (packageValue === "" || !(Number(packageValue) > 0)) return "Paket değeri zorunlu.";
      if (cod) {
        if (codAmount === "" || !(Number(codAmount) > 0)) return "Kapıda ödeme tutarı zorunlu.";
      }
      if (invLoading) return "Kutu listesi yükleniyor, lütfen bekleyin.";
      if (invErr) return `Kutu listesi hatası: ${invErr}`;
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

        // ✅ il/ilçe endpointlerden geliyor
        city: cityName.trim(), // il
        district: districtName.trim(), // ilçe

        country: countryCode.trim(), // "TR"
        postcode: zip.trim(),

        // ✅ gizli ama payload dolu
        lat: lat.trim(),
        lon: lon.trim(),
      },
      items,
    };

    setSubmitting(true);
    try {
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
                  className={cn("h-5 w-9 rounded-full relative transition border", useDifferentSender ? "bg-indigo-600 border-indigo-600" : "bg-neutral-200 border-neutral-200")}
                  aria-label="Farklı adresten gönder"
                >
                  <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition", useDifferentSender ? "left-4.5" : "left-0.5")} />
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

            <div className="mt-8 border-t border-neutral-200 pt-6">
              <SectionTitle title="Adres" />
              <div className="mt-2 text-xs text-neutral-500">
                Kaynaklar: <span className="font-mono">GET /logistics/countries</span>, <span className="font-mono">GET /logistics/states</span>, <span className="font-mono">GET /logistics/cities</span>
              </div>
            </div>

            {/* Country */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Label text="Ülke *" />
                <select
                  value={countryId === "" ? "" : String(countryId)}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : "";
                    setCountryId(v);
                    const c = countries.find((x) => x.id === Number(v));
                    setCountryCode(String(c?.iso2 || "TR").toUpperCase() || "TR");
                  }}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">{countries.length ? "Ülke seçin" : "Ülkeler yükleniyor..."}</option>
                  {countries.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} {c.iso2 ? `(${String(c.iso2).toUpperCase()})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* İl */}
              <div className="lg:col-span-1">
                <Label text="İl *" />
                <select
                  value={stateId === "" ? "" : String(stateId)}
                  onChange={(e) => setStateId(e.target.value ? Number(e.target.value) : "")}
                  disabled={!countryId}
                  className={cn(
                    "h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200",
                    !countryId ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"
                  )}
                >
                  <option value="">{!countryId ? "Önce ülke seçin" : states.length ? "İl seçin" : "İller yükleniyor..."}</option>
                  {states.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* İlçe */}
              <div className="lg:col-span-1">
                <Label text="İlçe *" />
                <select
                  value={cityId === "" ? "" : String(cityId)}
                  onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : "")}
                  disabled={!countryId || !stateId}
                  className={cn(
                    "h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200",
                    !countryId || !stateId ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"
                  )}
                >
                  <option value="">{!countryId || !stateId ? "Önce ülke ve il seçin" : cities.length ? "İlçe seçin" : "İlçeler yükleniyor..."}</option>
                  {cities.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <Label text="Tam Açık Adres *" />
              <textarea
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="Mahalle, Sokak, Bina no, Kapı no"
                className="min-h-[90px] w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
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

              {/* Debug toggle */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between">
                  <Label text="Lat/Lon (debug)" />
                  <button
                    type="button"
                    onClick={() => setShowLatLonDebug((p) => !p)}
                    className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
                  >
                    {showLatLonDebug ? "Gizle" : "Göster"}
                  </button>
                </div>

                {showLatLonDebug ? (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      <div>
                        <div className="mb-1 text-xs font-semibold text-neutral-600">Lat (AUTO)</div>
                        <input value={lat} readOnly className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700" />
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-semibold text-neutral-600">Lon (AUTO)</div>
                        <input value={lon} readOnly className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700" />
                      </div>
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setLat("");
                            setLon("");
                          }}
                          className="h-9 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                          title="Sadece debug amaçlı temizler"
                        >
                          Lat/Lon’u Temizle
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-neutral-500">
                      Not: Lat/Lon kullanıcıya görünmüyor. İlçe seçilince otomatik doluyor. Bu paneli sonra komple silebilirsin.
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500">
                    Lat/Lon otomatik dolduruluyor (payload’a gidiyor) ama kullanıcıya gösterilmiyor.
                  </div>
                )}
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
                <span className="font-semibold">Toplam Paket Sayısı</span> {boxes.length} <span className="mx-3 text-neutral-300">|</span>
                <span className="font-semibold">Toplam Ağırlık</span> {packageWeight} KG
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-neutral-500">
                Kutu listesi: <span className="font-mono">GET /oto/inventory/box</span> • Kutu ekle: <span className="font-mono">POST /oto/inventory/add-box</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadInventoryBoxes()}
                  className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
                  disabled={invLoading}
                >
                  {invLoading ? "Yükleniyor…" : "Kutuları Yenile"}
                </button>

                <button
                  type="button"
                  onClick={() => setAddBoxOpen((p) => !p)}
                  className="h-9 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  + Kutu Ekle (Envanter)
                </button>
              </div>
            </div>

            {invErr ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{invErr}</div> : null}

            {addBoxOpen ? (
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-sm font-semibold text-neutral-900">Yeni Kutu (Envantere ekle)</div>

                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <Label text="name *" />
                    <input
                      value={newBoxName}
                      onChange={(e) => setNewBoxName(e.target.value)}
                      placeholder="kargo"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div>
                    <Label text="length *" />
                    <input
                      value={newBoxL}
                      onChange={(e) => setNewBoxL(e.target.value === "" ? "" : num(e.target.value))}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <Label text="width *" />
                    <input
                      value={newBoxW}
                      onChange={(e) => setNewBoxW(e.target.value === "" ? "" : num(e.target.value))}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <Label text="height *" />
                    <input
                      value={newBoxH}
                      onChange={(e) => setNewBoxH(e.target.value === "" ? "" : num(e.target.value))}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => !addBoxSubmitting && setAddBoxOpen(false)}
                    className="h-10 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
                    disabled={addBoxSubmitting}
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    onClick={addInventoryBox}
                    className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    disabled={addBoxSubmitting}
                  >
                    {addBoxSubmitting ? "Ekleniyor…" : "Envantere Ekle"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {boxes.map((bx, idx) => {
                const sel = bx.boxId ? invBoxes.find((b) => b.id === Number(bx.boxId)) : null;

                return (
                  <div key={idx} className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_64px] items-center">
                    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
                      <div className="text-xs font-semibold text-neutral-500">Kutu Boyutları *</div>

                      <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold text-neutral-500">Kutu Tipi</div>
                          <select
                            value={bx.boxId === "" ? "" : String(bx.boxId)}
                            onChange={(e) => updateBox(idx, { boxId: e.target.value ? Number(e.target.value) : "" })}
                            disabled={invLoading}
                            className={cn(
                              "mt-1 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200",
                              invLoading ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"
                            )}
                          >
                            <option value="">{invLoading ? "Kutular yükleniyor..." : invBoxes.length ? "Kutu seçin" : "Kutu yok (ekleyin)"}</option>
                            {invBoxes.map((b) => (
                              <option key={b.id} value={String(b.id)}>
                                {b.boxName} ({b.length}x{b.width}x{b.height})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-neutral-500">Seçili Ölçüler</div>
                          <div className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 flex items-center text-sm text-neutral-700">
                            {sel ? `${sel.length} x ${sel.width} x ${sel.height} cm` : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-neutral-400">
                        Not: API tek set boxWidth/boxLength/boxHeight alıyor. Şimdilik <span className="font-semibold">1. satırdaki</span> seçili kutuyu gönderiyoruz.
                      </div>
                    </div>

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

                    <button
                      type="button"
                      onClick={() => setBoxes((b) => b.filter((_, i) => i !== idx))}
                      className="h-10 w-10 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                      title="Sil"
                    >
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setBoxes((b) => [...b, { boxId: "", weight: 1 }])}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              + Yeni Kutu (Paket) Ekle
            </button>

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
                  <div className="font-semibold">{cityName ? `${cityName} / ${districtName || "-"}` : "-"}</div>
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

              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-700">
                Adres payload preview: country={countryCode || "-"}, city={cityName || "-"}, district={districtName || "-"}{" "}
                <span className="mx-2 text-neutral-300">|</span>
                Lat/Lon: {lat || "-"}, {lon || "-"} (hidden)
              </div>

              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-700">
                Seçili kutu (1. satır):{" "}
                <span className="font-semibold">
                  {selectedFirstBox ? `${selectedFirstBox.boxName} (${selectedFirstBox.length}x${selectedFirstBox.width}x${selectedFirstBox.height})` : "—"}
                </span>
                <span className="mx-2 text-neutral-300">|</span>
                Payload: boxLength={boxLength}, boxWidth={boxWidth}, boxHeight={boxHeight}
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

      {/* Messages */}
      {(errMsg || okMsg) && (
        <div className="mt-4">
          {errMsg ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errMsg}</div> : null}
          {okMsg ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{okMsg}</div> : null}
        </div>
      )}

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
