"use client";

import * as React from "react";
import Image from "next/image";
import MapPicker, { type GeoPoint } from "@/src/components/map/MapPicker";
import { getAuthToken } from "@/src/utils/auth";

const readJson = async (res: Response): Promise<any> => {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : null;
  } catch {
    return t;
  }
};

type CorporateProfileForm = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  fullAddress: string;
  countryId: number;
  stateId: number;
  cityId: number;
  latitude: number;
  longitude: number;
  tax_office: string;
  tax_number: string;
  iban: string;
  resume: string;
};

type Country = { id: number; name: string; iso2?: string; iso3?: string; phonecode?: string };
type State = { id: number; name: string; country_id: number; country_code?: string; iso2?: string };
type City = { id: number; name: string; state_id: number; state_code?: string; country_id?: number; country_code?: string; timezone?: string | null };

const pickMsg = (j: any, fallback: string) =>
  j?.error?.message || j?.message || j?.detail || j?.title || (typeof j === "string" ? j : fallback);

export default function CorporateProfilePage() {
  const token = React.useMemo(getAuthToken, []);

  const [form, setForm] = React.useState<CorporateProfileForm>({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    fullAddress: "",
    countryId: 0,
    stateId: 0,
    cityId: 0,
    latitude: 0,
    longitude: 0,
    tax_office: "",
    tax_number: "",
    iban: "",
    resume: "",
  });

  const [commissionRate, setCommissionRate] = React.useState<number | null>(null);
  const [commissionRateDescription, setCommissionRateDescription] = React.useState<string>("");

  const [editing, setEditing] = React.useState({
    email: false,
    phone: false,
    firstName: false,
    lastName: false,
    fullAddress: false,
    countryId: false,
    stateId: false,
    cityId: false,
    latitude: false,
    longitude: false,
    tax_office: false,
    tax_number: false,
    iban: false,
    resume: false,
  });

  const toggle = (k: keyof typeof editing) => setEditing((s) => ({ ...s, [k]: !s[k] }));

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  // Geo lists
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [states, setStates] = React.useState<State[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);
  const [geoLoading, setGeoLoading] = React.useState({ countries: false, states: false, cities: false });

  // ========= input helpers =========
  const onChangeText =
    (k: keyof CorporateProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value as any }));

  const onChangeNumber =
    (k: keyof CorporateProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setForm((p) => ({ ...p, [k]: v === "" ? 0 : Number(v) } as any));
    };

  const mapValue: GeoPoint | null = React.useMemo(() => {
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) return { lat, lng };
    return null;
  }, [form.latitude, form.longitude]);

  const onPickFromMap = (p: GeoPoint) => {
    setForm((prev) => ({
      ...prev,
      latitude: Number(p.lat.toFixed(6)),
      longitude: Number(p.lng.toFixed(6)),
      fullAddress: p.address ? String(p.address) : prev.fullAddress,
    }));
  };

  // ========= Geo fetchers =========
  const loadCountries = React.useCallback(async () => {
    setGeoLoading((s) => ({ ...s, countries: true }));
    try {
      const res = await fetch("/yuksi/geo/countries?limit=200&offset=0", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const j = await readJson(res);
      if (!res.ok) throw new Error(pickMsg(j, `HTTP ${res.status}`));
      const list: Country[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setCountries(list);
    } catch (e: any) {
      // ülkeler gelmezse sayfayı tamamen öldürmeyelim
      setErrMsg(e?.message || "Ülke listesi alınamadı.");
    } finally {
      setGeoLoading((s) => ({ ...s, countries: false }));
    }
  }, []);

  const loadStates = React.useCallback(async (countryId: number) => {
    if (!countryId || countryId < 1) {
      setStates([]);
      return;
    }
    setGeoLoading((s) => ({ ...s, states: true }));
    try {
      const res = await fetch(`/yuksi/geo/states?country_id=${countryId}&limit=500&offset=0`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const j = await readJson(res);
      if (!res.ok) throw new Error(pickMsg(j, `HTTP ${res.status}`));
      const list: State[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setStates(list);
    } catch (e: any) {
      setErrMsg(e?.message || "İl listesi alınamadı.");
      setStates([]);
    } finally {
      setGeoLoading((s) => ({ ...s, states: false }));
    }
  }, []);

  const loadCities = React.useCallback(async (stateId: number) => {
    if (!stateId || stateId < 1) {
      setCities([]);
      return;
    }
    setGeoLoading((s) => ({ ...s, cities: true }));
    try {
      const res = await fetch(`/yuksi/geo/cities?state_id=${stateId}&limit=1000&offset=0`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const j = await readJson(res);
      if (!res.ok) throw new Error(pickMsg(j, `HTTP ${res.status}`));
      const list: City[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setCities(list);
    } catch (e: any) {
      setErrMsg(e?.message || "İlçe listesi alınamadı.");
      setCities([]);
    } finally {
      setGeoLoading((s) => ({ ...s, cities: false }));
    }
  }, []);

  // ========= initial load (profile + countries) =========
  React.useEffect(() => {
    let alive = true;
    if (!token) return;

    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        // countries paralel gelsin
        loadCountries();

        const res = await fetch("/yuksi/corporate/profile", {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const j = await readJson(res);
        if (!res.ok) throw new Error(pickMsg(j, `HTTP ${res.status}`));

        const data = j?.data ?? j ?? {};
        if (!alive) return;

        const nextForm: CorporateProfileForm = {
          email: data.email ?? "",
          phone: data.phone ?? "",
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          fullAddress: data.fullAddress ?? "",
          countryId: Number(data.countryId ?? 0) || 0,
          stateId: Number(data.stateId ?? 0) || 0,
          cityId: Number(data.cityId ?? 0) || 0,
          tax_office: data.tax_office ?? "",
          tax_number: data.tax_number ?? "",
          iban: data.iban ?? "",
          resume: data.resume ?? "",
          latitude: Number(data.latitude ?? 0) || 0,
          longitude: Number(data.longitude ?? 0) || 0,
        };

        setForm(nextForm);

        if (data.commissionRate != null) setCommissionRate(Number(data.commissionRate) || 0);
        if (data.commissionDescription != null) setCommissionRateDescription(String(data.commissionDescription || ""));

        // mevcut seçimlere göre state/city listelerini doldur
        if (nextForm.countryId >= 1) await loadStates(nextForm.countryId);
        if (nextForm.stateId >= 1) await loadCities(nextForm.stateId);
      } catch (e: any) {
        if (!alive) return;
        setErrMsg(e?.message || "Profil bilgileri alınamadı.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, loadCountries, loadStates, loadCities]);

  // ========= handlers for selects =========
  const onPickCountry = async (countryId: number) => {
    setForm((p) => ({ ...p, countryId, stateId: 0, cityId: 0 }));
    setCities([]);
    await loadStates(countryId);
  };

  const onPickState = async (stateId: number) => {
    setForm((p) => ({ ...p, stateId, cityId: 0 }));
    await loadCities(stateId);
  };

  const onPickCity = (cityId: number) => setForm((p) => ({ ...p, cityId }));

  // ========= save =========
  const saveAll = async () => {
    if (!token || saving) return;

    setOkMsg(null);
    setErrMsg(null);

    // Backend min 1 istiyor -> seçilmediyse kaydetme
    if (!(Number(form.countryId) >= 1)) return setErrMsg("Lütfen ülke seçin.");
    if (!(Number(form.stateId) >= 1)) return setErrMsg("Lütfen il seçin.");
    if (!(Number(form.cityId) >= 1)) return setErrMsg("Lütfen ilçe seçin.");

    setSaving(true);
    try {
      const body: any = {
        email: String(form.email || ""),
        phone: String(form.phone || ""),
        firstName: String(form.firstName || ""),
        lastName: String(form.lastName || ""),
        fullAddress: String(form.fullAddress || ""),
        tax_office: String(form.tax_office || ""),
        tax_number: String(form.tax_number || ""),
        iban: String(form.iban || ""),
        resume: String(form.resume || ""),
        countryId: Number(form.countryId),
        stateId: Number(form.stateId),
        cityId: Number(form.cityId),
      };

      const latNum = Number(form.latitude);
      const lngNum = Number(form.longitude);
      if (Number.isFinite(latNum)) body.latitude = latNum;
      if (Number.isFinite(lngNum)) body.longitude = lngNum;

      const res = await fetch("/yuksi/corporate/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const j = await readJson(res);
      if (!res.ok) throw new Error(pickMsg(j, `HTTP ${res.status}`));

      setOkMsg(j?.message || "Profil başarıyla güncellendi.");
      setEditing({
        email: false,
        phone: false,
        firstName: false,
        lastName: false,
        fullAddress: false,
        countryId: false,
        stateId: false,
        cityId: false,
        tax_office: false,
        tax_number: false,
        iban: false,
        resume: false,
        latitude: false,
        longitude: false,
      });
    } catch (e: any) {
      setErrMsg(e?.message || "Profil güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>

      {loading && <div className="rounded-xl border border-neutral-200 bg-white p-4">Yükleniyor...</div>}

      {!loading && (
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-neutral-200/70 bg-orange-50 p-4 sm:p-6">
            {okMsg && (
              <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                {okMsg}
              </div>
            )}
            {errMsg && (
              <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                {errMsg}
              </div>
            )}

            <Block title="Genel Bilgiler">
              <Row>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="Ad"
                  value={form.firstName}
                  onChange={onChangeText("firstName")}
                  disabled={!editing.firstName}
                />
                <EditButton onClick={() => toggle("firstName")} active={editing.firstName} />
              </Row>
              <Row>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="Soyad"
                  value={form.lastName}
                  onChange={onChangeText("lastName")}
                  disabled={!editing.lastName}
                />
                <EditButton onClick={() => toggle("lastName")} active={editing.lastName} />
              </Row>
              <Row>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="Özgeçmiş / açıklama"
                  value={form.resume}
                  onChange={onChangeText("resume")}
                  disabled={!editing.resume}
                />
                <EditButton onClick={() => toggle("resume")} active={editing.resume} />
              </Row>
            </Block>

            <Block title="İletişim & Adres">
              <Row>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="Telefon"
                  value={form.phone}
                  onChange={onChangeText("phone")}
                  disabled={!editing.phone}
                />
                <EditButton onClick={() => toggle("phone")} active={editing.phone} />
              </Row>
              <Row>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="E-Posta"
                  value={form.email}
                  onChange={onChangeText("email")}
                  disabled={!editing.email}
                />
                <EditButton onClick={() => toggle("email")} active={editing.email} />
              </Row>

              {/* Country / State / City */}
              <Row>
                <select
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  value={form.countryId}
                  disabled={!editing.countryId || geoLoading.countries}
                  onChange={(e) => onPickCountry(Number(e.target.value))}
                >
                  <option value={0}>{geoLoading.countries ? "Ülkeler yükleniyor..." : "Ülke seçin"}</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <EditButton onClick={() => toggle("countryId")} active={editing.countryId} />
              </Row>

              <Row>
                <select
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  value={form.stateId}
                  disabled={!editing.stateId || geoLoading.states || !(form.countryId >= 1)}
                  onChange={(e) => onPickState(Number(e.target.value))}
                >
                  <option value={0}>
                    {!(form.countryId >= 1)
                      ? "Önce ülke seçin"
                      : geoLoading.states
                      ? "İller yükleniyor..."
                      : "İl seçin"}
                  </option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <EditButton onClick={() => toggle("stateId")} active={editing.stateId} />
              </Row>

              <Row>
                <select
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  value={form.cityId}
                  disabled={!editing.cityId || geoLoading.cities || !(form.stateId >= 1)}
                  onChange={(e) => onPickCity(Number(e.target.value))}
                >
                  <option value={0}>
                    {!(form.stateId >= 1)
                      ? "Önce il seçin"
                      : geoLoading.cities
                      ? "İlçeler yükleniyor..."
                      : "İlçe seçin"}
                  </option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <EditButton onClick={() => toggle("cityId")} active={editing.cityId} />
              </Row>

              <Row>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="Adres"
                  value={form.fullAddress}
                  onChange={onChangeText("fullAddress")}
                  disabled={!editing.fullAddress}
                />
                <EditButton onClick={() => toggle("fullAddress")} active={editing.fullAddress} />
              </Row>
            </Block>

            <Block title="Vergi/Finans">
              <Row>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="Vergi Dairesi"
                  value={form.tax_office}
                  onChange={onChangeText("tax_office")}
                  disabled={!editing.tax_office}
                />
                <EditButton onClick={() => toggle("tax_office")} active={editing.tax_office} />
              </Row>
              <Row>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="Vergi No"
                  value={form.tax_number}
                  onChange={onChangeText("tax_number")}
                  disabled={!editing.tax_number}
                />
                <EditButton onClick={() => toggle("tax_number")} active={editing.tax_number} />
              </Row>
              <Row>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="IBAN"
                  value={form.iban}
                  onChange={onChangeText("iban")}
                  disabled={!editing.iban}
                />
                <EditButton onClick={() => toggle("iban")} active={editing.iban} />
              </Row>
            </Block>

            <Block title="Konum">
              <Row>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="Enlem (örn: 40.123456)"
                  value={form.latitude}
                  onChange={onChangeNumber("latitude")}
                  disabled={!editing.latitude}
                />
                <EditButton onClick={() => toggle("latitude")} active={editing.latitude} />
              </Row>
              <Row>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none disabled:bg-white"
                  placeholder="Boylam (örn: 29.123456)"
                  value={form.longitude}
                  onChange={onChangeNumber("longitude")}
                  disabled={!editing.longitude}
                />
                <EditButton onClick={() => toggle("longitude")} active={editing.longitude} />
              </Row>

              <div className="mt-3">
                <MapPicker
                  label="Haritada Konum Seç"
                  value={mapValue}
                  onChange={onPickFromMap}
                  defaultCenter={{ lat: 41.015137, lng: 28.97953 }}
                />
              </div>
            </Block>

            <Block title="Komisyon Bilgisi (sadece görüntüleme)">
              <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800">
                <div>
                  <span className="font-semibold">Komisyon Oranı: </span>
                  {commissionRate != null ? `%${commissionRate}` : "-"}
                </div>
                <div className="mt-1">
                  <div className="font-semibold">Açıklama: </div>
                  {commissionRateDescription || "-"}
                </div>
              </div>
            </Block>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={saveAll}
                disabled={saving || !token}
                className="rounded-xl border border-orange-300 bg-white px-6 py-2.5 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50 disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-neutral-200/70 bg-white p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-40 w-40">
                <Image
                  src="/Brand/yuksi.png"
                  alt="profile"
                  fill
                  className="rounded-full object-cover ring-4 ring-orange-500"
                />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="font-semibold text-orange-600">Ad Soyad:</span>{" "}
                  {form.firstName || form.lastName ? `${form.firstName} ${form.lastName}` : "-"}
                </p>
                <p>
                  <span className="font-semibold text-orange-600">Telefon:</span> {form.phone || "-"}
                </p>
                <p>
                  <span className="font-semibold text-orange-600">E-Posta:</span> {form.email || "-"}
                </p>
                <p>
                  <span className="font-semibold text-orange-600">Komisyon Oranı:</span>{" "}
                  {commissionRate != null ? `${commissionRate}` : "-"}
                </p>
              </div>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-sm font-semibold text-neutral-800">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-[1fr_auto] items-center gap-3">{children}</div>;
}

function EditButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
        active ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-500 hover:bg-emerald-600"
      }`}
    >
      DÜZENLE
    </button>
  );
}
