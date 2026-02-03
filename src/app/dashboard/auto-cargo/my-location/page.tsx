// /src/app/dashboard/auto-cargo/my-location/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";
import { ModuleAccessGuard } from "@/src/components/access/ModuleAccessGuard";
import { CORPORATE_MODULES } from "@/src/hooks/useCorporateAccess";

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

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

/* ================= Types (tolerant) ================= */

type PickupLocationRaw = Record<string, any>;

type ListRes = {
  success?: boolean;
  message?: any;
  warnings?: any;
  otoErrorCode?: any;
  otoErrorMessage?: any;

  warehouses?: any;
  branches?: any;

  data?: any;
  items?: any;
};

type PickupLocationItem = {
  id: string;
  placeName: string; // Yer ismi (brandName)
  contactName: string; // Ad Soyad (contactName)
  mobile: string; // Telefon
  city: string; // Şehir
  district: string; // İlçe
  address: string; // Adres
  email: string;
  postcode: string;
  status: "active" | "passive" | "unknown";
  locationCode: string; // UI’de görünen “Konum Kodu” (API’de code’a mapliyoruz)
  description: string; // UI’de görünen “Açıklama” (API’de description’a mapliyoruz)
};

function toStr(v: any) {
  return v == null ? "" : String(v);
}

function normalizeStatus(x: any): "active" | "passive" | "unknown" {
  const s = String(x ?? "").toLowerCase().trim();
  if (!s) return "unknown";
  if (s.includes("active") || s.includes("aktif")) return "active";
  if (s.includes("passive") || s.includes("pasif") || s.includes("inactive")) return "passive";
  return "unknown";
}

function normalizeOne(raw: PickupLocationRaw, idx: number): PickupLocationItem {
  const id =
    toStr(raw?.id) ||
    toStr(raw?.pickupLocationId) ||
    toStr(raw?.warehouse_id) ||
    toStr(raw?.branch_id) ||
    `row-${idx}`;

  // ✅ API: warehouses -> name, code, contactPerson, contactPhone, contactEmail
  const placeName = toStr(raw?.name ?? raw?.brandName ?? raw?.placeName ?? raw?.title).trim();
  const contactName = toStr(raw?.contactPerson ?? raw?.contactName ?? raw?.fullName ?? raw?.contact ?? raw?.personName).trim();
  const mobile = toStr(raw?.contactPhone ?? raw?.mobile ?? raw?.phone ?? raw?.telephone ?? raw?.tel).trim();
  const email = toStr(raw?.contactEmail ?? raw?.email).trim();

  const city = toStr(raw?.city ?? raw?.province ?? raw?.state).trim();
  const district = toStr(raw?.district ?? raw?.town ?? raw?.ilce).trim();
  const address = toStr(raw?.address ?? raw?.fullAddress ?? raw?.addr).trim();

  const postcode = toStr(raw?.postcode ?? raw?.zip ?? raw?.postalCode).trim();

  // ✅ UI: Konum Kodu -> code
  const locationCode = toStr(raw?.code ?? raw?.locationCode ?? "").trim();

  // ✅ UI: Açıklama -> API’de yok, varsa kullan
  const description = toStr(raw?.description ?? "").trim();

  const status = normalizeStatus(raw?.status ?? raw?.state ?? raw?.is_active);

  return {
    id,
    placeName,
    contactName,
    mobile,
    city,
    district,
    address,
    email,
    postcode,
    status,
    locationCode,
    description,
  };
}

function extractList(json: ListRes): PickupLocationItem[] {
  const buckets: any[] = [];

  const pushArr = (x: any) => {
    if (Array.isArray(x)) buckets.push(...x);
  };

  pushArr(json?.warehouses);
  pushArr(json?.branches);

  pushArr(json?.data);
  pushArr(json?.items);

  if (Array.isArray(json as any)) pushArr(json as any);

  const maybe = (json as any)?.data?.list || (json as any)?.data?.rows || (json as any)?.list;
  pushArr(maybe);

  return buckets.map((r, i) => normalizeOne(r ?? {}, i));
}

/* ===== Logistics Types (create-cargo ile aynı mantık) ===== */

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

/* ================= UI ================= */

function StatusPill({ v }: { v: PickupLocationItem["status"] }) {
  const label = v === "active" ? "Aktif" : v === "passive" ? "Pasif" : "—";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 sm:gap-2 rounded-full border px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold",
        v === "active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : v === "passive"
            ? "border-neutral-200 bg-neutral-50 text-neutral-600"
            : "border-neutral-200 bg-white text-neutral-500"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0",
          v === "active" ? "bg-emerald-500" : v === "passive" ? "bg-neutral-400" : "bg-neutral-300"
        )}
      />
      {label}
    </span>
  );
}

function Label({ text }: { text: string }) {
  return <div className="mb-2 text-sm font-semibold text-neutral-800">{text}</div>;
}

function Field({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      type={type}
      className={cn(
        "h-9 sm:h-10 w-full rounded-lg border px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200",
        disabled || readOnly ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"
      )}
    />
  );
}

/* ================= Page ================= */

export default function MyLocationPage() {
  const router = useRouter();

  // list state
  const [status, setStatus] = React.useState<"active" | "passive">("active");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<PickupLocationItem[]>([]);

  // filters
  const [fPlace, setFPlace] = React.useState("");
  const [fName, setFName] = React.useState("");
  const [fPhone, setFPhone] = React.useState("");
  const [fCity, setFCity] = React.useState("");
  const [fAddr, setFAddr] = React.useState("");
  const [fStatus, setFStatus] = React.useState<"" | "active" | "passive">("");

  // modal
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);

  // create form fields
  const [placeName, setPlaceName] = React.useState("");
  const [locationCode, setLocationCode] = React.useState(""); // ✅ code'a map
  const [description, setDescription] = React.useState(""); // ✅ description'a map
  const [contactName, setContactName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [postcode, setPostcode] = React.useState("");

  // ✅ Logistics selects (create-cargo ile aynı)
  const [countries, setCountries] = React.useState<LogisticsCountry[]>([]);
  const [states, setStates] = React.useState<LogisticsState[]>([]);
  const [cities, setCities] = React.useState<LogisticsCity[]>([]);

  const [countryId, setCountryId] = React.useState<number | "">("");
  const [stateId, setStateId] = React.useState<number | "">("");
  const [cityId, setCityId] = React.useState<number | "">("");

  // payload strings (pickup-location/create beklediği city/district)
  const [cityName, setCityName] = React.useState(""); // il
  const [districtName, setDistrictName] = React.useState(""); // ilçe

  // lat/lon (AUTO, hidden)
  const [lat, setLat] = React.useState("");
  const [lon, setLon] = React.useState("");

  // debug lat/lon görünümü (istersen sonra kaldır)
  const [debugLatLon, setDebugLatLon] = React.useState(false);

  const cityOptions = React.useMemo(() => {
    const s = new Set(rows.map((r) => r.city).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, [rows]);

  const placeOptions = React.useMemo(() => {
    const s = new Set(rows.map((r) => r.placeName).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, [rows]);

  const GRID = "grid-cols-[180px_160px_140px_130px_1fr_110px]";

  /* ================= Pickup Locations List ================= */

  const load = React.useCallback(
    async (st: "active" | "passive") => {
      setErr(null);
      setLoading(true);

      const bearer = getBearerToken();
      if (!bearer) {
        setLoading(false);
        router.replace("/");
        return;
      }

      try {
        const res = await fetch(`/yuksi/oto/inventory/pickup-location/list?status=${encodeURIComponent(st)}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${bearer}`,
          },
        });

        const json = await readJson<ListRes>(res);

        if (res.status === 401 || res.status === 403) {
          router.replace("/");
          return;
        }
        if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

        const list = extractList(json);
        setRows(list);
      } catch (e: any) {
        setRows([]);
        setErr(e?.message || "Liste alınamadı.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  React.useEffect(() => {
    load(status);
  }, [load, status]);

  const filtered = React.useMemo(() => {
    const norm = (s: string) => s.toLowerCase().trim();
    const p = norm(fPlace);
    const n = norm(fName);
    const ph = norm(fPhone);
    const c = norm(fCity);
    const a = norm(fAddr);

    return rows.filter((r) => {
      if (p && !norm(r.placeName).includes(p)) return false;
      if (n && !norm(r.contactName).includes(n)) return false;
      if (ph && !norm(r.mobile).includes(ph)) return false;
      if (c && !norm(r.city).includes(c)) return false;
      if (a && !norm(r.address).includes(a)) return false;
      if (fStatus && r.status !== fStatus) return false;
      return true;
    });
  }, [rows, fPlace, fName, fPhone, fCity, fAddr, fStatus]);

  /* ================= Logistics Loaders (create-cargo gibi) ================= */

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

      // Default: TR varsa seç
      const tr =
        list.find((c) => String(c?.iso2 || "").toUpperCase() === "TR") ||
        list.find((c) => String(c?.name || "").toLowerCase() === "turkey") ||
        list[0];

      if (tr?.id) {
        setCountryId(tr.id);

        // İlleri hemen yükle - useEffect beklemeden (create-cargo mantığı)
        try {
          const statesRes = await fetch(`/yuksi/logistics/states?country_id=${encodeURIComponent(String(tr.id))}&limit=5000&offset=0`, {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json", Authorization: `Bearer ${bearer}` },
          });

          const statesJson = await readJson<LogisticsRes<LogisticsState>>(statesRes);

          if (statesRes.status === 401 || statesRes.status === 403) {
            router.replace("/");
            return;
          }
          if (statesRes.ok) {
            const statesList = Array.isArray(statesJson?.data) ? statesJson.data : [];
            setStates(statesList);
          }
        } catch {
          // İller yüklenemezse sessizce devam et, useEffect tekrar deneyecek
        }
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

      setFormErr(e?.message || "Ülke listesi alınamadı.");
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

        setFormErr(e?.message || "İl listesi alınamadı.");
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

        // reset district selection
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

        setFormErr(e?.message || "İlçe listesi alınamadı.");
      }
    },
    [router]
  );

  // Countries: sayfa ilk açılışta bir kere yükle (modal açınca hazır olsun)
  React.useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  // country değişince iller
  React.useEffect(() => {
    if (!countryId) return;
    loadStates(Number(countryId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId]);

  // il değişince ilçeler + cityName set
  React.useEffect(() => {
    if (!countryId || !stateId) return;

    const st = states.find((s) => s.id === Number(stateId));
    setCityName(st ? String(st.name || "").trim() : "");

    loadCities(Number(countryId), Number(stateId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateId]);

  // ilçe değişince districtName + lat/lon set
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

  function resetForm() {
    setFormErr(null);
    setPlaceName("");
    setLocationCode("");
    setDescription("");
    setContactName("");
    setEmail("");
    setMobile("");
    setAddress("");
    setPostcode("");

    // ✅ logistics reset - states listesini koruyoruz (iller zaten yüklü)
    // countryId TR olarak kalıyor, sadece seçimleri sıfırlıyoruz
    setStateId("");
    setCities([]);
    setCityId("");

    setCityName("");
    setDistrictName("");
    setLat("");
    setLon("");

    setDebugLatLon(false);
  }

  async function createPickupLocation() {
    setFormErr(null);

    const bearer = getBearerToken();
    if (!bearer) {
      router.replace("/");
      return;
    }

    const bName = placeName.trim();
    const cName = contactName.trim();
    const mail = email.trim();
    const tel = mobile.trim();
    const addr = address.trim();
    const zip = (postcode || "").trim();

    // city/district endpointten dolacak
    const cty = cityName.trim();
    const dist = districtName.trim();

    // ✅ ayrı alanlar
    const code = locationCode.trim(); // kullanıcıya "Konum Kısaltması"
    const desc = description.trim(); // kullanıcıya "Açıklama"

    if (!bName) return setFormErr("Yer ismi zorunlu.");
    if (!code) return setFormErr("Konum Kısaltması zorunlu."); // ✅ code required
    if (!cName) return setFormErr("Ad Soyad zorunlu.");
    if (!mail) return setFormErr("E-posta zorunlu.");
    if (!tel) return setFormErr("Telefon numarası zorunlu.");
    if (!addr) return setFormErr("Tam açık adres zorunlu.");

    if (!countryId) return setFormErr("Ülke seçimi zorunlu.");
    if (!stateId) return setFormErr("İl seçimi zorunlu.");
    if (!cityId) return setFormErr("İlçe seçimi zorunlu.");

    if (!cty) return setFormErr("İl (city) otomatik dolmadı.");
    if (!dist) return setFormErr("İlçe (district) otomatik dolmadı.");

    // lat/lon payload’a basılacak
    if (!lat.trim() || !lon.trim()) return setFormErr("Lat/Lon otomatik dolmadı. İlçe seçimini kontrol et.");

    setSaving(true);
    try {
      const res = await fetch(`/yuksi/oto/inventory/pickup-location/create`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify({
          brandName: bName,
          address: addr,
          mobile: tel,
          city: cty,
          district: dist,
          lat: Number(String(lat || "").replace(",", ".")),
          lon: Number(String(lon || "").replace(",", ".")),
          email: mail,
          postcode: zip,
          contactName: cName,

          // ✅ Backend validation: code required
          code,
          // ✅ separate description (optional)
          description: desc,
        }),
      });

      const json: any = await readJson(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));
      if (json?.success === false) throw new Error(pickMsg(json, "Kayıt başarısız."));

      // ✅ UX: kapanmadan önce eski hata/fieldlar temizlensin
      setOpen(false);
      resetForm();
      await load(status);
    } catch (e: any) {
      setFormErr(e?.message || "Kayıt oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  // ✅ UX: corporate/il/ilçe vs. seçimin değişmesi gibi modal içi değişimlerde eski errorları temiz tut
  React.useEffect(() => {
    if (!open) return;
    setFormErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <ModuleAccessGuard moduleId={CORPORATE_MODULES.YUKSI_KARGO}>
    <div className="w-full max-w-full overflow-x-hidden px-2 py-4 sm:px-4 sm:py-5 lg:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-700">
            <span className="text-base sm:text-lg">⌂</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 truncate">Gönderici Konumları</h1>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap"
        >
          + Gönderici Konumu Ekle
        </button>
      </div>

      {/* Controls */}
      <div className="mt-3 sm:mt-4 rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-neutral-700">Durum:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 sm:h-10 rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="active">active</option>
              <option value="passive">passive</option>
            </select>

            <button
              type="button"
              onClick={() => load(status)}
              disabled={loading}
              className="h-9 sm:h-10 rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            >
              {loading ? "Yükleniyor…" : "Yenile"}
            </button>
          </div>
        </div>

        {err ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-rose-700 break-words">{err}</div> : null}
      </div>

      {/* Table */}
      <div className="mt-3 sm:mt-4 w-full rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          {/* Filters row */}
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            {/* Header */}
            <div className={cn("grid gap-2 text-xs font-semibold text-neutral-600", GRID)}>
              <div>Yer ismi</div>
              <div>Ad Soyad</div>
              <div>Telefon</div>
              <div>Şehir</div>
              <div>Adres</div>
              <div>Durum</div>
            </div>

            {/* Filters */}
            <div className={cn("mt-2 grid gap-2 items-center", GRID)}>
              <select
                value={fPlace}
                onChange={(e) => setFPlace(e.target.value)}
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Tümü</option>
                {placeOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>

              <input
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="İsim ara"
              />

              <input
                value={fPhone}
                onChange={(e) => setFPhone(e.target.value)}
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Telefon"
              />

              <select
                value={fCity}
                onChange={(e) => setFCity(e.target.value)}
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Tümü</option>
                {cityOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>

              <input
                value={fAddr}
                onChange={(e) => setFAddr(e.target.value)}
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Adres"
              />

              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value as any)}
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Tümü</option>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="divide-y divide-neutral-100">
            {loading ? (
              <div className="p-6 text-sm text-neutral-600">Yükleniyor…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-neutral-600">Kayıt bulunamadı.</div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="px-3 py-2">
                  <div className={cn("grid gap-2 items-center text-[13px]", GRID)}>
                    <div className="text-neutral-900 font-semibold truncate" title={r.placeName}>
                      {r.placeName || "—"}
                      {r.locationCode ? <div className="text-xs text-neutral-500 font-normal truncate">Kod: {r.locationCode}</div> : null}
                      {r.description ? <div className="text-xs text-neutral-500 font-normal truncate">Açıklama: {r.description}</div> : null}
                    </div>

                    <div className="text-neutral-800 truncate" title={r.contactName}>
                      {r.contactName || "—"}
                    </div>

                    <div className="text-indigo-600 font-semibold truncate" title={r.mobile}>
                      {r.mobile || "—"}
                    </div>

                    <div className="text-neutral-800 truncate" title={r.city}>
                      {r.city || "—"}
                    </div>

                    <div className="text-neutral-800 truncate" title={r.address}>
                      {r.address || "—"}
                    </div>

                    <div>
                      <StatusPill v={r.status} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden w-full overflow-x-hidden">
          {/* Filters */}
          <div className="border-b border-neutral-200 bg-neutral-50 p-2 sm:p-3 space-y-2">
            <select
              value={fPlace}
              onChange={(e) => setFPlace(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Yer İsmi - Tümü</option>
              {placeOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="İsim ara"
              />

              <input
                value={fPhone}
                onChange={(e) => setFPhone(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Telefon"
              />
            </div>

            <select
              value={fCity}
              onChange={(e) => setFCity(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Şehir - Tümü</option>
              {cityOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={fAddr}
                onChange={(e) => setFAddr(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Adres"
              />

              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value as any)}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Durum - Tümü</option>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </div>
          </div>

          {/* Cards */}
          <div className="divide-y divide-neutral-100 w-full">
            {loading ? (
              <div className="p-4 sm:p-6 text-xs sm:text-sm text-neutral-600">Yükleniyor…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 sm:p-6 text-xs sm:text-sm text-neutral-600">Kayıt bulunamadı.</div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="p-3 sm:p-4 w-full">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm sm:text-base font-semibold text-neutral-900 truncate" title={r.placeName}>
                          {r.placeName || "—"}
                        </div>
                        {r.locationCode ? (
                          <div className="text-xs text-neutral-500 font-normal mt-0.5">Kod: {r.locationCode}</div>
                        ) : null}
                        {r.description ? (
                          <div className="text-xs text-neutral-500 font-normal mt-0.5 truncate">Açıklama: {r.description}</div>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        <StatusPill v={r.status} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div>
                        <span className="text-neutral-500">Ad Soyad: </span>
                        <span className="font-semibold text-neutral-800 truncate block">{r.contactName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Telefon: </span>
                        <span className="font-semibold text-indigo-600 truncate block">{r.mobile || "—"}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Şehir: </span>
                        <span className="font-semibold text-neutral-800 truncate block">{r.city || "—"}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-neutral-500 text-xs">Adres: </span>
                      <div className="text-xs sm:text-sm text-neutral-800 mt-0.5 break-words">{r.address || "—"}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => !saving && setOpen(false)} />
          <div className="relative w-full max-w-[980px] max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-xl border border-neutral-200">
            <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-neutral-200">
              <div className="text-sm sm:text-lg font-semibold text-neutral-900 truncate">Gönderici Konumu Ekle</div>
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-lg sm:text-xl"
                title="Kapat"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)] px-3 sm:px-6 py-4 sm:py-5">
              {formErr ? (
                <div className="mb-3 sm:mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-rose-700 break-words">{formErr}</div>
              ) : null}

              {/* Row 1 */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                <div>
                  <Label text="Yer ismi *" />
                  <Field value={placeName} onChange={setPlaceName} placeholder="" />
                </div>

                <div>
                  <Label text="Konum Kısaltması *" />
                  <Field value={locationCode} onChange={setLocationCode} placeholder="Örn: PNLKNM" />
                </div>
              </div>

              {/* ✅ Description */}
              <div className="mt-3 sm:mt-4">
                <Label text="Açıklama" />
                <Field value={description} onChange={setDescription} placeholder="Örn: Panel Konum deposu" />
              </div>

              {/* Row 2 */}
              <div className="mt-3 sm:mt-4 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                <div>
                  <Label text="Ad Soyad *" />
                  <Field value={contactName} onChange={setContactName} placeholder="" />
                </div>
                <div>
                  <Label text="E-posta *" />
                  <Field value={email} onChange={setEmail} placeholder="" type="email" />
                </div>
              </div>

              {/* Phone */}
              <div className="mt-3 sm:mt-4">
                <Label text="Telefon Numarası *" />
                <div className="flex gap-2">
                  <button type="button" className="h-9 sm:h-10 rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm shrink-0">
                    🇹🇷 ▼
                  </button>
                  <Field value={mobile} onChange={setMobile} placeholder="" />
                </div>
              </div>

              {/* ✅ Address selectors (ülke/il/ilçe endpointlerden) */}
              <div className="mt-6 sm:mt-8 border-t border-neutral-200 pt-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-semibold text-neutral-900">Adres</div>
              </div>

              <div className="mt-3 sm:mt-4 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
                {/* Ülke */}
                <div className="lg:col-span-1">
                  <Label text="Ülke *" />
                  <select
                    value={countryId === "" ? "" : String(countryId)}
                    onChange={(e) => {
                      setFormErr(null);
                      const v = e.target.value ? Number(e.target.value) : "";
                      setCountryId(v);
                    }}
                    className="h-9 sm:h-10 w-full rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
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
                    onChange={(e) => {
                      setFormErr(null);
                      setStateId(e.target.value ? Number(e.target.value) : "");
                    }}
                    disabled={!countryId}
                    className={cn(
                      "h-9 sm:h-10 w-full rounded-lg border px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200",
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
                    onChange={(e) => {
                      setFormErr(null);
                      setCityId(e.target.value ? Number(e.target.value) : "");
                    }}
                    disabled={!countryId || !stateId}
                    className={cn(
                      "h-9 sm:h-10 w-full rounded-lg border px-2 sm:px-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200",
                      !countryId || !stateId ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"
                    )}
                  >
                    <option value="">
                      {!countryId || !stateId ? "Önce ülke ve il seçin" : cities.length ? "İlçe seçin" : "İlçeler yükleniyor..."}
                    </option>
                    {cities.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="mt-3 sm:mt-4">
                <Label text="Tam Açık Adres *" />
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Sorun yaşamamak için tam adres giriniz (Mahalle, Sokak, Bina no, İlçe, İl)"
                  className="min-h-[80px] sm:min-h-[90px] w-full rounded-lg border border-neutral-200 px-2 sm:px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* Postcode */}
              <div className="mt-3 sm:mt-4">
                <Label text="Posta Kodu" />
                <Field value={postcode} onChange={setPostcode} placeholder="06000" />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                className="h-9 sm:h-10 rounded-lg border border-indigo-200 bg-white px-3 sm:px-4 text-xs sm:text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                disabled={saving}
              >
                İptal Et
              </button>
              <button
                type="button"
                onClick={createPickupLocation}
                className="h-9 sm:h-10 rounded-lg bg-indigo-600 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Ekleniyor…" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </ModuleAccessGuard>
  );
}
