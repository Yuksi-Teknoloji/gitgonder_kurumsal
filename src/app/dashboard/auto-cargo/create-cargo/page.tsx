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
function rand4() {
  return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
}

function makeOrderId() {
  // örn: YUKSI-ORD-20260118-195501-4821
  const d = new Date();
  return `YUKSI-ORD-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}-${rand4()}`;
}

function makePickupCode() {
  // örn: PUP-ANK-20260118-195501-7392
  const d = new Date();
  return `PUP-ANK-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}-${rand4()}`;
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
  state: string; // il
  city: string; // il
  country: string; // "TR"
  postcode: string;
  lat: number;
  lon: number;
};

type PickupLocationCreateReq = {
  code: string; // ✅ required (backend validation)
  brandName: string;
  address: string;
  mobile: string;
  city: string;
  district: string;
  lat: number;
  lon: number;
  email: string;
  postcode: string;
  contactName: string;
  description: string;
};

type PickupLocationCreateRes = {
  success?: boolean;
  message?: any;
  otoErrorCode?: any;
  otoErrorMessage?: any;
  code?: string; // backend genelde code döndürür
  data?: { code?: string } | any;
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
  pickupLocation: PickupLocationLine[];
};
type PickupLocationLine = { pickupLocationCode: string; quantity: number };

type CreateOrderReq = {
  order_id: string;
  pickup_location_code: string;
  create_shipment: boolean;
  delivery_option_id: number;

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
type PickupWarehouse = {
  id?: number;
  code: string;
  name: string;
  address?: string;
  city?: string;
  district?: string;
  lat?: number;
  lon?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: string;
};

type PickupListRes = {
  success?: boolean;
  message?: any;
  warnings?: any;
  otoErrorCode?: any;
  otoErrorMessage?: any;
  warehouses?: PickupWarehouse[];
  branches?: any[];
};

/* ================= Page ================= */

export default function CreateCargoPage() {
  const router = useRouter();

  const [step, setStep] = React.useState<StepKey>(1);

  // ===== AWB (Print label) =====
  const [awbLoading, setAwbLoading] = React.useState(false);
  const [awbErr, setAwbErr] = React.useState<string | null>(null);
  const [awbUrl, setAwbUrl] = React.useState<string | null>(null);

  // api state
  const [submitting, setSubmitting] = React.useState(false);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [lastRes, setLastRes] = React.useState<CreateOrderRes | null>(null);

  // ========== CREDIT ==========
  const [creditBalance, setCreditBalance] = React.useState<number>(0);
  const [creditOpen, setCreditOpen] = React.useState(false);

  // ========== STEP 1 ==========
  const [pickupLocationCode, setPickupLocationCode] = React.useState<string>("");

  // Different sender address form (manual + now logistics-driven)
  const [senderPickupCode, setSenderPickupCode] = React.useState<string>("");
  const senderPickupCodeAutoRef = React.useRef(false);
  const [senderBrandName, setSenderBrandName] = React.useState("");
  const [senderContactName, setSenderContactName] = React.useState("");
  const [senderEmail, setSenderEmail] = React.useState("");
  const [senderMobile, setSenderMobile] = React.useState("");

  const [senderAddress, setSenderAddress] = React.useState("");
  const [senderCity, setSenderCity] = React.useState("");
  const [senderDistrict, setSenderDistrict] = React.useState("");
  const [senderPostcode, setSenderPostcode] = React.useState("");
  const [senderLat, setSenderLat] = React.useState("");
  const [senderLon, setSenderLon] = React.useState("");

  const [pickupCreating, setPickupCreating] = React.useState(false);
  const [pickupCreateErr, setPickupCreateErr] = React.useState<string | null>(null);
  const [pickupCreateOk, setPickupCreateOk] = React.useState<string | null>(null);
  const [useDifferentSender, setUseDifferentSender] = React.useState(false);

  // pickup locations list (existing sender locations)
  const [pickupList, setPickupList] = React.useState<PickupWarehouse[]>([]);
  const [pickupListLoading, setPickupListLoading] = React.useState(false);
  const [pickupListErr, setPickupListErr] = React.useState<string | null>(null);
  const [selectedPickupCode, setSelectedPickupCode] = React.useState<string>("");
  const selectedPickup = React.useMemo(() => {
    const code = selectedPickupCode || pickupLocationCode;
    if (!code) return null;
    return pickupList.find((w) => String(w.code).trim() === String(code).trim()) || null;
  }, [pickupList, selectedPickupCode, pickupLocationCode]);

  // Receiver
  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState("");
  const [receiverEmail, setReceiverEmail] = React.useState("");

  // Address
  const [fullAddress, setFullAddress] = React.useState("");
  const [zip, setZip] = React.useState("");

  // Logistics selects (receiver: country/il/ilçe)
  const [countries, setCountries] = React.useState<LogisticsCountry[]>([]);
  const [states, setStates] = React.useState<LogisticsState[]>([]);
  const [cities, setCities] = React.useState<LogisticsCity[]>([]);

  const [countryId, setCountryId] = React.useState<number | "">("");
  const [stateId, setStateId] = React.useState<number | "">("");
  const [cityId, setCityId] = React.useState<number | "">("");

  // payload strings (receiver)
  const [countryCode, setCountryCode] = React.useState("TR"); // backend payload (customer.country)
  const [cityName, setCityName] = React.useState(""); // il (customer.city)
  const [districtName, setDistrictName] = React.useState(""); // ilçe (customer.district)

  // lat/lon (receiver, AUTO, hidden)
  const [lat, setLat] = React.useState("");
  const [lon, setLon] = React.useState("");

  // Sender logistics (pickup location create: country/il/ilçe from endpoints + auto lat/lon)
  const [senderCountryId, setSenderCountryId] = React.useState<number | "">("");
  const [senderStateId, setSenderStateId] = React.useState<number | "">("");
  const [senderCityId, setSenderCityId] = React.useState<number | "">("");

  const [senderStates, setSenderStates] = React.useState<LogisticsState[]>([]);
  const [senderCities, setSenderCities] = React.useState<LogisticsCity[]>([]);

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
  const [serviceType, setServiceType] = React.useState<
    "express" | "sameDay" | "fastDelivery" | "coldDelivery" | "heavyAndBulky" | "electronicAndHeavy"
  >("express");

  const [deliveryType, setDeliveryType] = React.useState<
    "toCustomerDoorstep" | "pickupByCustomer" | "toCustomerDoorstepOrPickupByCustomer"
  >("toCustomerDoorstep");
  // ========== STEP 3 (Oto fee / rates) ==========
  type OtoFeeReq = {
    originCity: string;
    destinationCity: string;
    weight: number;

    originLat: number;
    originLon: number;
    destinationLat: number;
    destinationLon: number;

    forReverseShipment: boolean;
    currency: string;

    packageCount: number;
    totalDue: number;

    length: number;
    width: number;
    height: number;

    serviceType: string;
    deliveryType: string;
    includeEstimatedDates: boolean;
  };

  type OtoFeeOption = {
    deliveryOptionId?: number;
    delivery_option_id?: number;

    carrierName?: string;
    carrier?: string;
    companyName?: string;

    price?: number;
    amount?: number;
    total?: number;

    serviceType?: string;
    deliveryType?: string;

    estimatedFrom?: string;
    estimatedTo?: string;

    [k: string]: any;
  };

  type OtoFeeRes = {
    success?: boolean;
    message?: any;
    otoErrorMessage?: any;
    data?: OtoFeeOption[];
    options?: OtoFeeOption[];
    result?: OtoFeeOption[];
    [k: string]: any;
  };

  const [feeLoading, setFeeLoading] = React.useState(false);
  const [feeErr, setFeeErr] = React.useState<string | null>(null);
  const [feeOptions, setFeeOptions] = React.useState<OtoFeeOption[]>([]);
  const [selectedFeeIdx, setSelectedFeeIdx] = React.useState<number | null>(null);

  // ========== STEP 4 ==========
  const SENDER_COMPANY = "Yüksi Lojistik";
  const [senderName] = React.useState<string>(SENDER_COMPANY);
  const [orderId] = React.useState<string>(() => makeOrderId());
  const [deliveryOptionId, setDeliveryOptionId] = React.useState<number | "">(564);
  const [createShipment, setCreateShipment] = React.useState(true);

  const [currency, setCurrency] = React.useState("TRY");
  const [customsValue, setCustomsValue] = React.useState("12");
  const [customsCurrency, setCustomsCurrency] = React.useState("TRY");

  const [orderDate, setOrderDate] = React.useState<string>(() => fmtOrderDate(new Date()));

  const shippingFee = selectedPrice !== "" ? Number(selectedPrice) : 0; // ✅ kargo ücreti
  const insufficientBalanceForShipment = createShipment && !cod && shippingFee > creditBalance;

  /* ================= Logistics Loaders (receiver) ================= */

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

      // Default: TR varsa onu seç (receiver + sender için de aynı default'u basalım)
      const tr =
        list.find((c) => String(c?.iso2 || "").toUpperCase() === "TR") ||
        list.find((c) => String(c?.name || "").toLowerCase() === "turkey") ||
        list[0];

      if (tr?.id) {
        // receiver defaults
        setCountryId(tr.id);
        setCountryCode(String(tr.iso2 || "TR").toUpperCase() || "TR");

        // sender defaults (pickup location)
        setSenderCountryId(tr.id);
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

      setSenderCountryId("");
      setSenderStates([]);
      setSenderStateId("");
      setSenderCities([]);
      setSenderCityId("");
      setSenderCity("");
      setSenderDistrict("");
      setSenderLat("");
      setSenderLon("");

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

  /* ================= Sender Logistics Loaders (pickup create) ================= */

  const loadSenderStates = React.useCallback(
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
        setSenderStates(list);

        // reset dependent
        setSenderStateId("");
        setSenderCities([]);
        setSenderCityId("");
        setSenderCity("");
        setSenderDistrict("");
        setSenderLat("");
        setSenderLon("");
      } catch (e: any) {
        setSenderStates([]);
        setSenderStateId("");
        setSenderCities([]);
        setSenderCityId("");
        setSenderCity("");
        setSenderDistrict("");
        setSenderLat("");
        setSenderLon("");
        setErrMsg(e?.message || "Gönderici il listesi alınamadı.");
      }
    },
    [router]
  );

  const loadSenderCities = React.useCallback(
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
        setSenderCities(list);

        // reset district selection
        setSenderCityId("");
        setSenderDistrict("");
        setSenderLat("");
        setSenderLon("");
      } catch (e: any) {
        setSenderCities([]);
        setSenderCityId("");
        setSenderDistrict("");
        setSenderLat("");
        setSenderLon("");
        setErrMsg(e?.message || "Gönderici ilçe listesi alınamadı.");
      }
    },
    [router]
  );

  // initial: countries
  React.useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  // when receiver country changes: load receiver states
  React.useEffect(() => {
    if (!countryId) return;
    loadStates(Number(countryId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId]);

  // when receiver state changes: set cityName + load receiver cities
  React.useEffect(() => {
    if (!countryId || !stateId) return;

    const st = states.find((s) => s.id === Number(stateId));
    setCityName(st ? String(st.name || "").trim() : "");

    loadCities(Number(countryId), Number(stateId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateId]);

  // when receiver city (district) changes: set districtName + lat/lon
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

  // when sender country changes: load sender states
  React.useEffect(() => {
    if (!senderCountryId) return;
    loadSenderStates(Number(senderCountryId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senderCountryId]);

  // when sender state changes: set senderCity + load sender cities
  React.useEffect(() => {
    if (!senderCountryId || !senderStateId) return;

    const st = senderStates.find((s) => s.id === Number(senderStateId));
    setSenderCity(st ? String(st.name || "").trim() : "");

    loadSenderCities(Number(senderCountryId), Number(senderStateId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senderStateId]);

  // when sender district changes: set senderDistrict + senderLat/Lon auto
  React.useEffect(() => {
    if (!senderCityId) {
      setSenderDistrict("");
      setSenderLat("");
      setSenderLon("");
      return;
    }

    const ct = senderCities.find((c) => c.id === Number(senderCityId));
    const dName = ct ? String(ct.name || "").trim() : "";
    setSenderDistrict(dName);

    const la = ct?.latitude ?? "";
    const lo = ct?.longitude ?? "";
    setSenderLat(la === null || la === undefined ? "" : String(la));
    setSenderLon(lo === null || lo === undefined ? "" : String(lo));
  }, [senderCityId, senderCities]);

  React.useEffect(() => {
    if (!useDifferentSender) return;

    // sadece ilk açılışta bir kere üret
    if (!senderPickupCodeAutoRef.current) {
      const code = makePickupCode();
      setSenderPickupCode(code);
      senderPickupCodeAutoRef.current = true;
    }
  }, [useDifferentSender]);

  const loadPickupLocations = React.useCallback(async () => {
    setPickupListErr(null);
    setPickupListLoading(true);

    const bearer = getBearerToken();
    if (!bearer) {
      setPickupListLoading(false);
      router.replace("/");
      return;
    }

    try {
      const res = await fetch(`/yuksi/oto/inventory/pickup-location/list?status=active`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json", Authorization: `Bearer ${bearer}` },
      });

      const json = await readJson<PickupListRes>(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      const list = Array.isArray(json?.warehouses) ? json.warehouses : [];
      setPickupList(list);

      // eğer toggle kapalı ve daha önce seçilmemişse: ilk kaydı default seç
      if (!useDifferentSender) {
        const first = list[0];
        if (first?.code && !pickupLocationCode) {
          setSelectedPickupCode(String(first.code));
          setPickupLocationCode(String(first.code));
        }
      }
    } catch (e: any) {
      setPickupList([]);
      setPickupListErr(e?.message || "Pickup location listesi alınamadı.");
    } finally {
      setPickupListLoading(false);
    }
  }, [router, useDifferentSender, pickupLocationCode]);

  React.useEffect(() => {
    if (useDifferentSender) return; // toggle açıkken liste şart değil
    loadPickupLocations();
  }, [useDifferentSender, loadPickupLocations]);
  React.useEffect(() => {
    if (useDifferentSender) {
      setSelectedPickupCode("");
      setPickupLocationCode(""); // toggle açınca user create flow ile doldurulacak
    }
  }, [useDifferentSender]);

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

  async function createPickupLocationAndSetCode() {
    setPickupCreateErr(null);
    setPickupCreateOk(null);

    const bearer = getBearerToken();
    if (!bearer) {
      router.replace("/");
      return false;
    }

    // minimal validation
    if (!senderPickupCode.trim()) return setPickupCreateErr("code zorunlu."), false; // ✅
    if (!senderBrandName.trim()) return setPickupCreateErr("brandName zorunlu."), false;
    if (!senderContactName.trim()) return setPickupCreateErr("contactName zorunlu."), false;
    if (!senderMobile.trim()) return setPickupCreateErr("mobile zorunlu."), false;
    if (!senderEmail.trim()) return setPickupCreateErr("email zorunlu."), false;

    // ✅ sender location now from endpoints
    if (!senderCountryId) return setPickupCreateErr("Ülke seçimi zorunlu."), false;
    if (!senderStateId) return setPickupCreateErr("İl seçimi zorunlu."), false;
    if (!senderCityId) return setPickupCreateErr("İlçe seçimi zorunlu."), false;

    if (!senderCity.trim()) return setPickupCreateErr("city zorunlu."), false;
    if (!senderDistrict.trim()) return setPickupCreateErr("district zorunlu."), false;

    if (!senderAddress.trim()) return setPickupCreateErr("address zorunlu."), false;
    if (!senderPostcode.trim()) return setPickupCreateErr("postcode zorunlu."), false;
    if (!senderLat.trim() || !senderLon.trim()) return setPickupCreateErr("lat/lon otomatik dolmadı. İlçe seçimini kontrol et."), false;

    setPickupCreating(true);
    try {
      const body: PickupLocationCreateReq = {
        code: senderPickupCode.trim(), // ✅ REQUIRED
        brandName: senderBrandName.trim(),
        address: senderAddress.trim(),
        mobile: senderMobile.trim(),
        city: senderCity.trim(),
        district: senderDistrict.trim(),
        lat: Number(senderLat),
        lon: Number(senderLon),
        email: senderEmail.trim(),
        postcode: senderPostcode.trim(),
        contactName: senderContactName.trim(),
        description: "AUTO",
      };

      const res = await fetch("/yuksi/oto/inventory/pickup-location/create", {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(body),
      });

      const json = await readJson<PickupLocationCreateRes>(res);
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      const code = String(json?.code || json?.data?.code || body.code || "").trim();
      if (!code) throw new Error(json?.otoErrorMessage || json?.message || "Pickup location code dönmedi.");

      setPickupLocationCode(code);
      setPickupCreateOk(`Pickup location oluşturuldu. code=${code}`);
      return true;
    } catch (e: any) {
      setPickupCreateErr(e?.message || "Pickup location oluşturulamadı.");
      return false;
    } finally {
      setPickupCreating(false);
    }
  }
  const DEFAULT_ORIGIN = {
    city: "Ankara",         // depo ili
    lat: 39.92077,          // depo lat
    lon: 32.85411,          // depo lon
  };

  function first<T>(...vals: Array<T | undefined | null>): T | undefined {
    for (const v of vals) if (v !== undefined && v !== null) return v;
    return undefined;
  }

  function optionIdOf(o: OtoFeeOption): number | null {
    const id = first(o.deliveryOptionId, o.delivery_option_id);
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function carrierOf(o: OtoFeeOption) {
    return String(first(
      (o as any).deliveryOptionName,
      (o as any).deliveryCompanyName,
      o.carrierName,
      o.companyName,
      o.carrier,
      "—"
    ));
  }

  function priceOf(o: OtoFeeOption) {
    const p = Number(first(o.price, o.amount, o.total, 0));
    return Number.isFinite(p) ? p : 0;
  }

  async function fetchOtoFee() {
    setFeeErr(null);
    setFeeOptions([]);
    setSelectedFeeIdx(null);

    const bearer = getBearerToken();
    if (!bearer) {
      router.replace("/");
      return;
    }

    // destination = receiver
    const destinationCity = String(cityName || "").trim(); // il
    const destinationLat = num(lat);
    const destinationLon = num(lon);

    if (!destinationCity) return setFeeErr("destinationCity (il) boş."), void 0;
    if (!destinationLat || !destinationLon) return setFeeErr("destinationLat/Lon boş."), void 0;

    // origin = sender (different sender varsa oradan), yoksa DEFAULT
    const originCity = useDifferentSender ? String(senderCity || "").trim() : DEFAULT_ORIGIN.city;
    const originLat = useDifferentSender ? num(senderLat) : DEFAULT_ORIGIN.lat;
    const originLon = useDifferentSender ? num(senderLon) : DEFAULT_ORIGIN.lon;

    if (!originCity) return setFeeErr("originCity (gönderici il) boş."), void 0;
    if (!originLat || !originLon) return setFeeErr("originLat/Lon boş."), void 0;

    // weight + dimensions Step2
    const weight = Math.max(1, Number(packageWeight || 1));
    const length = Math.max(0, Number(boxLength || 0));
    const width = Math.max(0, Number(boxWidth || 0));
    const height = Math.max(0, Number(boxHeight || 0));

    // burada serviceType/deliveryType API’ye göre sabit veya UI’dan seçmeli.
    // şimdilik "string" göndermeyelim; backend kabul edeceği bir default verelim:
    const body: OtoFeeReq = {
      originCity,
      destinationCity,
      weight,

      originLat,
      originLon,
      destinationLat,
      destinationLon,

      forReverseShipment: false,
      currency: currency.trim() || "TRY",

      packageCount: Math.max(1, Number(packageCount || 1)),
      totalDue: 0,

      length,
      width,
      height,

      serviceType,
      deliveryType,
      includeEstimatedDates: true,
    };

    setFeeLoading(true);
    try {
      const res = await fetch("/yuksi/oto/logistics/oto-fee", {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(body),
      });

      const json = await readJson<OtoFeeRes>(res);
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      const list =
        (Array.isArray((json as any)?.deliveryCompany) && (json as any).deliveryCompany) ||
        (Array.isArray(json?.data) && json.data) ||
        (Array.isArray((json as any)?.options) && (json as any).options) ||
        (Array.isArray((json as any)?.result) && (json as any).result) ||
        [];

      if (!list.length) throw new Error(pickMsg(json, "Kargo fiyatları boş döndü."));

      setFeeOptions(list);
    } catch (e: any) {
      setFeeErr(e?.message || "Fiyat listesi alınamadı.");
    } finally {
      setFeeLoading(false);
    }
  }

  function validateStep(s: StepKey): string | null {
    if (s === 1) {
      if (useDifferentSender) {
        if (!pickupLocationCode.trim()) return "Pickup Location oluşturmadın. Lütfen Step 1'de pickup oluştur ve code oluştuğunu doğrula.";
      } else {
        if (!pickupLocationCode.trim())
          return "Gönderici konumu seçmelisin (Pickup Location).";
      }
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

      if (!customsCurrency.trim()) return "customsCurrency zorunlu.";
      if (!orderDate.trim()) return "orderDate zorunlu.";
    }

    return null;
  }
  async function fetchAwbUrl(order_id: string) {
    setAwbErr(null);

    const bearer = getBearerToken();
    if (!bearer) {
      router.replace("/");
      return null;
    }

    const clean = String(order_id || "").trim();
    if (!clean) {
      setAwbErr("order_id boş.");
      return null;
    }

    setAwbLoading(true);
    try {
      const res = await fetch(`/yuksi/api/oto/shipments/awb/${encodeURIComponent(clean)}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${bearer}`,
        },
      });

      const json: any = await readJson(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return null;
      }

      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      const url = String(json?.printAWBURL || "").trim();
      if (!url) throw new Error("printAWBURL boş geldi.");

      setAwbUrl(url);
      return url;
    } catch (e: any) {
      setAwbUrl(null);
      setAwbErr(e?.message || "AWB alınamadı.");
      return null;
    } finally {
      setAwbLoading(false);
    }
  }

  async function openAwbInNewTab() {
    // url daha önce alındıysa direkt aç
    const url = awbUrl || (await fetchAwbUrl(orderId));
    if (!url) return;

    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      setAwbErr("Pop-up engellendi. Tarayıcıdan bu site için pop-up izni verip tekrar dene.");
      return;
    }
    win.focus?.();
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
    if (useDifferentSender && !pickupLocationCode.trim()) {
      setErrMsg("Pickup Location code yok. Step 1'e dönüp pickup oluşturmalısın.");
      setStep(1);
      return;
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
        pickupLocation: [{ pickupLocationCode: pickupLocationCode.trim(), quantity: 1 }],
      },
    ];

    const body: CreateOrderReq = {
      order_id: orderId.trim(),
      payment_method,
      amount,
      amount_due,
      currency: currency.trim(),

      customer: {
        name: receiverName.trim(),
        email: receiverEmail.trim(),
        mobile: receiverPhone.trim(),
        address: fullAddress.trim(),
        district: districtName.trim(),
        city: cityName.trim(),
        state: cityName.trim(),
        country: countryCode.trim(),
        postcode: zip.trim(),
        lat: Number(lat),
        lon: Number(lon),
      },

      items,

      pickup_location_code: pickupLocationCode.trim(),
      create_shipment: Boolean(createShipment),
      delivery_option_id: Number(deliveryOptionId),

      senderName: senderName.trim(),
      packageCount,
      packageWeight,

      boxWidth,
      boxLength,
      boxHeight,

      orderDate: orderDate.trim(),
      customsCurrency: customsCurrency.trim(),
      customsValue: customsValue.trim(),
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

        // AWB state reset (yeni order için)
        setAwbErr(null);
        setAwbUrl(null);
      } else {
        setErrMsg(json?.otoErrorMessage || json?.message || "Order create başarısız.");
      }
    } catch (e: any) {
      setErrMsg(e?.message || "Order create çağrısı başarısız.");
    } finally {
      setSubmitting(false);
    }
  }
  const refreshCreditRef = React.useRef<null | (() => void)>(null);

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

        <CreditChip
          onBalanceChange={setCreditBalance}
          onTopUp={({ refreshCredit } = {}) => {
            refreshCreditRef.current = refreshCredit || null;
            setCreditOpen(true);
          }}
        />
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
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                Gönderici konumu:{" "}
                {pickupLocationCode ? <span className="font-semibold">{pickupLocationCode}</span> : <span className="text-neutral-500">Seçilmedi</span>}
              </div>
              {!useDifferentSender ? (
                <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="text-sm font-semibold text-neutral-900">Gönderici Konumu Seç</div>
                  {pickupListErr ? (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {pickupListErr}
                    </div>
                  ) : null}

                  <div className="mt-3">
                    <Label text="Pickup Location *" />
                    <select
                      value={selectedPickupCode || pickupLocationCode || ""}
                      onChange={(e) => {
                        const code = String(e.target.value || "");
                        setSelectedPickupCode(code);
                        setPickupLocationCode(code); // ✅ payload’a gidecek ana alan
                      }}
                      disabled={pickupListLoading}
                      className={cn(
                        "h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200",
                        pickupListLoading ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"
                      )}
                    >
                      <option value="">
                        {pickupListLoading ? "Yükleniyor..." : pickupList.length ? "Konum seçin" : "Konum bulunamadı"}
                      </option>

                      {pickupList.map((w) => (
                        <option key={String(w.code)} value={String(w.code)}>
                          {w.name}
                        </option>
                      ))}
                    </select>

                    {/* seçilince ufak preview, kullanıcıya sadece name şarttı ama debug/preview iyi */}
                    <div className="mt-2 text-xs text-neutral-500">
                      Seçili: <span className="font-semibold">{selectedPickup?.name || "—"}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={loadPickupLocations}
                      disabled={pickupListLoading}
                      className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-60"
                    >
                      {pickupListLoading ? "Yenileniyor…" : "Listeyi Yenile"}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex items-center gap-3 text-sm text-neutral-600">
                <button
                  type="button"
                  onClick={() => setUseDifferentSender((p) => !p)}
                  className={cn("h-5 w-9 rounded-full relative transition border", useDifferentSender ? "bg-indigo-600 border-indigo-600" : "bg-neutral-200 border-neutral-200")}
                  aria-label="Farklı adresten gönder"
                >
                  <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition", useDifferentSender ? "left-5" : "left-0.5")} />
                </button>
                Farklı bir adresten gönder
              </div>
            </div>

            {useDifferentSender ? (
              <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                <div className="text-sm font-semibold text-neutral-900">Gönderici Adresi (Pickup Location Oluştur)</div>

                {pickupCreateErr ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pickupCreateErr}</div>
                ) : null}
                {pickupCreateOk ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{pickupCreateOk}</div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <Label text="Konum Kodu *" />
                    <input
                      value={senderPickupCode}
                      readOnly
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm font-mono"
                    />
                    <div className="mt-1 text-xs text-neutral-500">
                      Konum kodu otomatik üretilir.
                    </div>
                  </div>

                  <div>
                    <Label text="Konum Kısaltması *" />
                    <input value={senderBrandName} onChange={(e) => setSenderBrandName(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm" />
                  </div>

                  <div>
                    <Label text="İsim *" />
                    <input value={senderContactName} onChange={(e) => setSenderContactName(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm" />
                  </div>
                  <div>
                    <Label text="email *" />
                    <input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm" />
                  </div>

                  <div>
                    <Label text="Telefon *" />
                    <input value={senderMobile} onChange={(e) => setSenderMobile(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm" />
                  </div>
                  <div>
                    <Label text="Posta Kodu *" />
                    <input value={senderPostcode} onChange={(e) => setSenderPostcode(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-1">
                    <Label text="Ülke *" />
                    <select
                      value={senderCountryId === "" ? "" : String(senderCountryId)}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : "";
                        setSenderCountryId(v);
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

                  <div className="lg:col-span-1">
                    <Label text="İl *" />
                    <select
                      value={senderStateId === "" ? "" : String(senderStateId)}
                      onChange={(e) => setSenderStateId(e.target.value ? Number(e.target.value) : "")}
                      disabled={!senderCountryId}
                      className={cn(
                        "h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200",
                        !senderCountryId ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"
                      )}
                    >
                      <option value="">{!senderCountryId ? "Önce ülke seçin" : senderStates.length ? "İl seçin" : "İller yükleniyor..."}</option>
                      {senderStates.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-1">
                    <Label text="İlçe *" />
                    <select
                      value={senderCityId === "" ? "" : String(senderCityId)}
                      onChange={(e) => setSenderCityId(e.target.value ? Number(e.target.value) : "")}
                      disabled={!senderCountryId || !senderStateId}
                      className={cn(
                        "h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200",
                        !senderCountryId || !senderStateId ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"
                      )}
                    >
                      <option value="">
                        {!senderCountryId || !senderStateId ? "Önce ülke ve il seçin" : senderCities.length ? "İlçe seçin" : "İlçeler yükleniyor..."}
                      </option>
                      {senderCities.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <Label text="address *" />
                  <textarea value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} className="min-h-[80px] w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={pickupCreating}
                    onClick={async () => {
                      const ok = await createPickupLocationAndSetCode();
                      if (ok) {
                        // optionally auto-next
                      }
                    }}
                    className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {pickupCreating ? "Oluşturuluyor…" : "Pickup Location Oluştur"}
                  </button>
                </div>

                <div className="mt-3 text-xs text-neutral-500">
                  Oluşan pickup code: <span className="font-mono">{pickupLocationCode || "-"}</span>
                </div>
              </div>
            ) : null}

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
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
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
                onClick={async () => {
                  const v = validateStep(2);
                  if (v) return setErrMsg(v);
                  next();
                  await fetchOtoFee();
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
            <SectionTitle title="Gönderim Ücretleri" />

            {feeErr ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{feeErr}</div>
            ) : null}
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <Label text="serviceType" />
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as any)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="express">express</option>
                  <option value="sameDay">sameDay</option>
                  <option value="fastDelivery">fastDelivery</option>
                  <option value="coldDelivery">coldDelivery</option>
                  <option value="heavyAndBulky">heavyAndBulky</option>
                  <option value="electronicAndHeavy">electronicAndHeavy</option>
                </select>
              </div>

              <div>
                <Label text="deliveryType" />
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as any)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="toCustomerDoorstep">toCustomerDoorstep</option>
                  <option value="pickupByCustomer">pickupByCustomer</option>
                  <option value="toCustomerDoorstepOrPickupByCustomer">toCustomerDoorstepOrPickupByCustomer</option>
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                Endpoint: <span className="font-mono">POST /oto/logistics/oto-fee</span>
              </div>
              <button
                type="button"
                onClick={fetchOtoFee}
                disabled={feeLoading}
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-60"
              >
                {feeLoading ? "Yükleniyor…" : "Yenile"}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-neutral-200 overflow-hidden">
              <div className="bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-600 grid grid-cols-[400px_140px_140px_160px_120px_80px] gap-3">
                <div>Kargo Şirketi</div>
                <div>Servis</div>
                <div>Teslimat</div>
                <div>ETA</div>
                <div>Fiyat</div>
                <div />
              </div>

              <div className="divide-y divide-neutral-200">
                {feeLoading ? (
                  <div className="p-4 text-sm text-neutral-600">Fiyatlar alınıyor…</div>
                ) : feeOptions.length ? (
                  feeOptions.map((o, idx) => {
                    const id = optionIdOf(o);
                    const chosen = selectedFeeIdx === idx;
                    return (
                      <div key={idx} className="px-4 py-3 grid grid-cols-[400px_140px_140px_160px_120px_80px] gap-3 items-center">
                        <div className="flex items-center gap-3">
                          {(o as any).logo ? (
                            <img
                              src={(o as any).logo}
                              alt={carrierOf(o)}
                              className="h-20 w-20 rounded-md border border-neutral-200 bg-white object-contain p-1"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-md border border-neutral-200 bg-neutral-50" />
                          )}

                          <div className="text-sm font-semibold text-neutral-900">{carrierOf(o)}</div>
                        </div>
                        <div className="text-sm text-neutral-700">{String(o.serviceType ?? "—")}</div>
                        <div className="text-sm text-neutral-700">{String(o.deliveryType ?? "—")}</div>
                        <div className="text-xs text-neutral-600">
                          {(o as any).estimatedPickupDate ? `PU: ${(o as any).estimatedPickupDate}` : "—"}
                          {(o as any).estimatedDeliveryDate ? ` / DL: ${(o as any).estimatedDeliveryDate}` : ""}
                        </div>
                        <div className="text-sm font-semibold text-neutral-900">
                          {priceOf(o)} {(o as any).currency || currency}
                        </div>

                        <button
                          type="button"
                          disabled={!id}
                          onClick={() => {
                            setSelectedFeeIdx(idx);
                            setSelectedCarrierName(carrierOf(o));
                            setSelectedPrice(priceOf(o));
                            if (id) setDeliveryOptionId(id); // ✅ Step4/create order için hazır
                          }}
                          className={cn(
                            "h-9 rounded-lg px-3 text-sm font-semibold border",
                            chosen ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50",
                            !id && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {chosen ? "Seçildi" : "Seç"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-sm text-neutral-600">Liste boş.</div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={prev} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
                ← Önceki
              </button>
              <button
                onClick={() => next()}
                disabled={deliveryOptionId === ""}   // ✅ seçmeden geçmesin
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                Devam ›
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
              <div className="text-sm font-semibold text-neutral-900">Sipariş Parametreleri</div>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <Label text="Gönderici Şirket *" />
                  <input value={senderName}
                    readOnly
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm font-mono outline-none"
                  />
                </div>
                <div>
                  <Label text="Sipariş Id *" />
                  <input
                    value={orderId}
                    readOnly
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm font-mono outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label text="Teslimat Id *" />
                    <input
                      value={deliveryOptionId}
                      readOnly
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 mt-8">
                    <input checked={createShipment} type="checkbox" disabled />
                    Gönderim oluşturulsun
                  </label>
                </div>


                <div>
                  <Label text="Para Birimi *" />
                  <input value={customsCurrency} readOnly className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>

                <div>
                  <Label text="Sipariş Tarihi * (dd/mm/yyyy HH:MM)" />
                  <input value={orderDate} readOnly className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
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
              <div
                className={cn(
                  "border-t px-5 py-4 text-sm",
                  insufficientBalanceForShipment ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"
                )}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-lg">{insufficientBalanceForShipment ? "🚫" : "⚠️"}</span>
                  <span>{insufficientBalanceForShipment ? "BAKİYE YETERSİZ" : "ÖNEMLİ BİLGİ"}</span>
                </div>

                <div className="mt-1">
                  Kargo ücreti: <strong>{shippingFee} {currency}</strong> • Cüzdan: <strong>{creditBalance} TRY</strong>
                  <br />
                  {insufficientBalanceForShipment ? (
                    <>
                      Cüzdan bakiyesi yetersiz olduğu için <strong>sipariş oluşur</strong> ancak <strong>kargo oluşturulamaz</strong>.
                      Bu durumda <strong>etiket yazdırılamaz</strong>.
                    </>
                  ) : (
                    <>
                      Bakiyeniz yeterliyse sipariş ile birlikte kargo da oluşturulur ve etiket yazdırabilirsiniz.
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCreditOpen(true)}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Bakiye Yükle
            </button>

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
      {/* Print AWB button (Order create sonrası) */}
      {lastRes?.success ? (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-sm font-semibold text-neutral-900">Kargo Etiketi</div>

          {insufficientBalanceForShipment ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <div className="font-semibold">🚫 Yetersiz bakiye</div>
              <div className="mt-1">
                Bu siparişte sadece <strong>sipariş</strong> oluşturulmuş olabilir. Kargo oluşmadıysa <strong>etiket alınamaz</strong>.
                Lütfen bakiye yükleyip tekrar deneyin.
              </div>
            </div>
          ) : null}

          <div className="mt-1 text-sm text-neutral-600">
            Sipariş oluşturuldu. Kargo etiketini yazdırmak için aşağıdaki butona tıkla.
          </div>

          {awbErr ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {awbErr}
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={openAwbInNewTab}
              disabled={awbLoading || insufficientBalanceForShipment}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {awbLoading ? "Etiket hazırlanıyor…" : "🖨️ Kargo Etiketini Yazdır"}
            </button>
            {insufficientBalanceForShipment ? (
              <div className="mt-2 text-xs text-rose-700">
                Etiket için önce bakiye yeterli olmalı (kargo oluşturulmalı).
              </div>
            ) : null}

            {awbUrl ? (
              <a
                href={awbUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Linki görüntüle
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <CreditTopUpModal
        open={creditOpen}
        onOpenChange={setCreditOpen}
        creditBalance={creditBalance}
        onAfterSuccess={() => refreshCreditRef.current?.()}
      />
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
