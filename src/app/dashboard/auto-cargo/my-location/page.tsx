// /src/app/dashboard/auto-cargo/my-location/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";

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
  locationCode: string; // UI’de görünen “Konum Kodu” (API’de yok, description’a mapliyoruz)
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

  const placeName = toStr(raw?.brandName ?? raw?.placeName ?? raw?.name ?? raw?.title).trim();
  const contactName = toStr(raw?.contactName ?? raw?.fullName ?? raw?.contact ?? raw?.personName).trim();
  const mobile = toStr(raw?.mobile ?? raw?.phone ?? raw?.telephone ?? raw?.tel).trim();
  const city = toStr(raw?.city ?? raw?.province ?? raw?.state).trim();
  const district = toStr(raw?.district ?? raw?.town ?? raw?.ilce).trim();
  const address = toStr(raw?.address ?? raw?.fullAddress ?? raw?.addr).trim();
  const email = toStr(raw?.email).trim();
  const postcode = toStr(raw?.postcode ?? raw?.zip ?? raw?.postalCode).trim();

  const locationCode = toStr(raw?.locationCode ?? raw?.code ?? raw?.description ?? "").trim();

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
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        v === "active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : v === "passive"
          ? "border-neutral-200 bg-neutral-50 text-neutral-600"
          : "border-neutral-200 bg-white text-neutral-500"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
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
        "h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200",
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
  const [locationCode, setLocationCode] = React.useState(""); // description'a map
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

      if (tr?.id) setCountryId(tr.id);
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
    setContactName("");
    setEmail("");
    setMobile("");
    setAddress("");
    setPostcode("");

    // ✅ logistics reset (modal her açılışta temiz başlasın)
    setCountryId((prev) => prev); // TR default kalsın
    setStates([]);
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

    if (!bName) return setFormErr("Yer ismi zorunlu.");
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
          description: locationCode.trim(), // Konum Kodu -> description
        }),
      });

      const json: any = await readJson(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));
      if (json?.success === false) throw new Error(pickMsg(json, "Kayıt başarısız."));

      setOpen(false);
      resetForm();
      await load(status);
    } catch (e: any) {
      setFormErr(e?.message || "Kayıt oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-700">
            <span className="text-lg">⌂</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Gönderici Konumları</h1>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Gönderici Konumu Ekle
        </button>
      </div>

      {/* Controls */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-neutral-700">Durum:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="active">active</option>
              <option value="passive">passive</option>
            </select>

            <button
              type="button"
              onClick={() => load(status)}
              disabled={loading}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            >
              {loading ? "Yükleniyor…" : "Yenile"}
            </button>
          </div>

          <div className="text-xs text-neutral-500">
            GET: <span className="font-mono">/oto/inventory/pickup-location/list</span> • POST:{" "}
            <span className="font-mono">/oto/inventory/pickup-location/create</span>
          </div>
        </div>

        {err ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div> : null}
      </div>

      {/* Table */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {/* Filters row */}
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="grid grid-cols-[48px_220px_200px_180px_180px_1fr_140px_56px] gap-3 text-xs font-semibold text-neutral-600">
            <div />
            <div>Yer ismi</div>
            <div>Ad Soyad</div>
            <div>Telefon Numarası</div>
            <div>Şehir</div>
            <div>Adres</div>
            <div>Durum</div>
            <div />
          </div>

          <div className="mt-3 grid grid-cols-[48px_220px_200px_180px_180px_1fr_140px_56px] gap-3 items-center">
            <div className="flex justify-center">
              <input type="checkbox" className="h-4 w-4" />
            </div>

            <select
              value={fPlace}
              onChange={(e) => setFPlace(e.target.value)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Seç</option>
              {placeOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <input
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder=""
            />

            <input
              value={fPhone}
              onChange={(e) => setFPhone(e.target.value)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder=""
            />

            <select
              value={fCity}
              onChange={(e) => setFCity(e.target.value)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Seç</option>
              {cityOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <input
              value={fAddr}
              onChange={(e) => setFAddr(e.target.value)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder=""
            />

            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value as any)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Seç</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>

            <div className="flex justify-end text-neutral-400">⋯</div>
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
              <div key={r.id} className="px-4 py-4">
                <div className="grid grid-cols-[48px_220px_200px_180px_180px_1fr_140px_56px] gap-3 items-center text-sm">
                  <div className="flex justify-center">
                    <input type="checkbox" className="h-4 w-4" />
                  </div>

                  <div className="text-neutral-900 font-semibold truncate" title={r.placeName}>
                    {r.placeName || "—"}
                    {r.locationCode ? <div className="text-xs text-neutral-500 font-normal truncate">Kod: {r.locationCode}</div> : null}
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

                  <button
                    type="button"
                    className="h-9 w-9 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                    title="Aksiyonlar (şimdilik yok)"
                  >
                    ⋯
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => !saving && setOpen(false)} />
          <div className="relative w-[980px] max-w-[95vw] rounded-2xl bg-white shadow-xl border border-neutral-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <div className="text-lg font-semibold text-neutral-900">Gönderici Konumu Ekle</div>
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                className="h-9 w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700"
                title="Kapat"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5">
              {formErr ? (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formErr}</div>
              ) : null}

              {/* Row 1 */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <Label text="Yer ismi *" />
                  <Field value={placeName} onChange={setPlaceName} placeholder="" />
                </div>

                <div>
                  <Label text="Konum Kodu" />
                  <Field value={locationCode} onChange={setLocationCode} placeholder="" />
                </div>
              </div>

              {/* Row 2 */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
              <div className="mt-4">
                <Label text="Telefon Numarası *" />
                <div className="flex gap-2">
                  <button type="button" className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
                    🇹🇷 ▼
                  </button>
                  <Field value={mobile} onChange={setMobile} placeholder="" />
                </div>
                <div className="mt-2 text-xs text-neutral-500">
                  Not: API alanı <span className="font-mono">mobile</span>.
                </div>
              </div>

              {/* ✅ Address selectors (ülke/il/ilçe endpointlerden) */}
              <div className="mt-8 border-t border-neutral-200 pt-6">
                <div className="text-sm font-semibold text-neutral-900">Adres</div>
                <div className="mt-2 text-xs text-neutral-500">
                  Kaynaklar: <span className="font-mono">GET /logistics/countries</span>,{" "}
                  <span className="font-mono">GET /logistics/states</span>, <span className="font-mono">GET /logistics/cities</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                    onChange={(e) => {
                      setFormErr(null);
                      setStateId(e.target.value ? Number(e.target.value) : "");
                    }}
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
                    onChange={(e) => {
                      setFormErr(null);
                      setCityId(e.target.value ? Number(e.target.value) : "");
                    }}
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

              {/* Address */}
              <div className="mt-4">
                <Label text="Tam Açık Adres *" />
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Sorun yaşamamak için tam adres giriniz (Mahalle, Sokak, Bina no, İlçe, İl)"
                  className="min-h-[90px] w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* Postcode */}
              <div className="mt-4">
                <Label text="Posta Kodu" />
                <Field value={postcode} onChange={setPostcode} placeholder="06000" />
              </div>

              {/* ✅ debug lat/lon (AUTO) */}
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-900">Debug (Lat/Lon)</div>
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input checked={debugLatLon} onChange={(e) => setDebugLatLon(e.target.checked)} type="checkbox" />
                    Göster
                  </label>
                </div>

                {debugLatLon ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div>
                      <Label text="lat (AUTO)" />
                      <Field value={lat} onChange={setLat} placeholder="" readOnly />
                    </div>
                    <div>
                      <Label text="lon (AUTO)" />
                      <Field value={lon} onChange={setLon} placeholder="" readOnly />
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-neutral-600">Lat/Lon ilçe seçilince otomatik doluyor ve payload’a gönderiliyor.</div>
                )}
              </div>

              {/* hidden city/district preview (payload) */}
              <div className="mt-2 text-xs text-neutral-500">
                Payload preview: city=<span className="font-mono">{cityName || "-"}</span>, district=<span className="font-mono">{districtName || "-"}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                className="h-10 rounded-lg border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                disabled={saving}
              >
                İptal Et
              </button>
              <button
                type="button"
                onClick={createPickupLocation}
                className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Ekleniyor…" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
