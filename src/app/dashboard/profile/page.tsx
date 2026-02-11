"use client";

import * as React from "react";
import Image from "next/image";
import MapPicker, { type GeoPoint } from "@/src/components/map/MapPicker";
import { getAuthToken } from "@/src/utils/auth";
import { Pencil, X } from "lucide-react";

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
  password: string;
};

type Country = { id: number; name: string; iso2?: string; iso3?: string; phonecode?: string };
type State = { id: number; name: string; country_id: number; country_code?: string; iso2?: string };
type City = {
  id: number;
  name: string;
  state_id: number;
  state_code?: string;
  country_id?: number;
  country_code?: string;
  timezone?: string | null;
};

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
    password: "",
  });

  const [commissionRate, setCommissionRate] = React.useState<number | null>(null);
  const [commissionRateDescription, setCommissionRateDescription] = React.useState<string>("");

  const [loading, setLoading] = React.useState(true);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  // Modal states
  const [generalModalOpen, setGeneralModalOpen] = React.useState(false);
  const [contactModalOpen, setContactModalOpen] = React.useState(false);
  const [taxModalOpen, setTaxModalOpen] = React.useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = React.useState(false);
  const [locationModalOpen, setLocationModalOpen] = React.useState(false);

  // Geo lists
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [states, setStates] = React.useState<State[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);
  const [geoLoading, setGeoLoading] = React.useState({ countries: false, states: false, cities: false });

  // Temp form for modals
  const [tempForm, setTempForm] = React.useState<Partial<CorporateProfileForm>>({});
  const [saving, setSaving] = React.useState(false);

  const mapValue: GeoPoint | null = React.useMemo(() => {
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) return { lat, lng };
    return null;
  }, [form.latitude, form.longitude]);

  const onPickFromMap = (p: GeoPoint) => {
    setTempForm((prev) => ({
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
          password: "",
        };

        setForm(nextForm);

        if (data.commissionRate != null) setCommissionRate(Number(data.commissionRate) || 0);
        if (data.commissionDescription != null) setCommissionRateDescription(String(data.commissionDescription || ""));

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

  // ========= Save functions for each section =========
  const saveSection = async (fields: Partial<CorporateProfileForm>) => {
    if (!token || saving) return;

    setOkMsg(null);
    setErrMsg(null);
    setSaving(true);

    try {
      const body: any = {};

      // Only include fields that are being updated
      Object.keys(fields).forEach((key) => {
        const value = fields[key as keyof CorporateProfileForm];
        if (value !== undefined) {
          body[key] = value;
        }
      });

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

      setOkMsg(j?.message || "Başarıyla güncellendi.");

      // Update main form with saved values
      setForm((prev) => ({ ...prev, ...fields }));

      // Close modals
      setGeneralModalOpen(false);
      setContactModalOpen(false);
      setTaxModalOpen(false);
      setPasswordModalOpen(false);
      setLocationModalOpen(false);

      // Clear temp form
      setTempForm({});
    } catch (e: any) {
      setErrMsg(e?.message || "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const openGeneralModal = () => {
    setTempForm({
      firstName: form.firstName,
      lastName: form.lastName,
      resume: form.resume,
    });
    setGeneralModalOpen(true);
  };

  const openContactModal = async () => {
    setTempForm({
      phone: form.phone,
      email: form.email,
      countryId: form.countryId,
      stateId: form.stateId,
      cityId: form.cityId,
      fullAddress: form.fullAddress,
    });
    if (form.countryId >= 1) await loadStates(form.countryId);
    if (form.stateId >= 1) await loadCities(form.stateId);
    setContactModalOpen(true);
  };

  const openTaxModal = () => {
    setTempForm({
      tax_office: form.tax_office,
      tax_number: form.tax_number,
      iban: form.iban,
    });
    setTaxModalOpen(true);
  };

  const openPasswordModal = () => {
    setTempForm({ password: "" });
    setPasswordModalOpen(true);
  };

  const openLocationModal = () => {
    setTempForm({
      latitude: form.latitude,
      longitude: form.longitude,
      fullAddress: form.fullAddress,
    });
    setLocationModalOpen(true);
  };

  const onPickCountry = async (countryId: number) => {
    setTempForm((p) => ({ ...p, countryId, stateId: 0, cityId: 0 }));
    setCities([]);
    await loadStates(countryId);
  };

  const onPickState = async (stateId: number) => {
    setTempForm((p) => ({ ...p, stateId, cityId: 0 }));
    await loadCities(stateId);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>

      {loading && <div className="rounded-xl border border-neutral-200 bg-white p-4">Yükleniyor...</div>}

      {!loading && (
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {okMsg && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                {okMsg}
              </div>
            )}
            {errMsg && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                {errMsg}
              </div>
            )}

            {/* General Info Section */}
            <SectionCard
              title="Genel Bilgiler"
              onEdit={openGeneralModal}
            >
              <InfoRow label="Ad" value={form.firstName || "-"} />
              <InfoRow label="Soyad" value={form.lastName || "-"} />
              <InfoRow label="Özgeçmiş" value={form.resume || "-"} />
            </SectionCard>

            {/* Contact & Address Section */}
            <SectionCard
              title="İletişim & Adres"
              onEdit={openContactModal}
            >
              <InfoRow label="Telefon" value={form.phone || "-"} />
              <InfoRow label="E-Posta" value={form.email || "-"} />
              <InfoRow
                label="Konum"
                value={`${countries.find(c => c.id === form.countryId)?.name || "-"} / ${states.find(s => s.id === form.stateId)?.name || "-"} / ${cities.find(c => c.id === form.cityId)?.name || "-"}`}
              />
              <InfoRow label="Adres" value={form.fullAddress || "-"} />
            </SectionCard>

            {/* Tax/Finance Section */}
            <SectionCard
              title="Vergi/Finans"
              onEdit={openTaxModal}
            >
              <InfoRow label="Vergi Dairesi" value={form.tax_office || "-"} />
              <InfoRow label="Vergi No" value={form.tax_number || "-"} />
              <InfoRow label="IBAN" value={form.iban || "-"} />
            </SectionCard>

            {/* Password Section */}
            <SectionCard
              title="Şifre Güncelle"
              onEdit={openPasswordModal}
            >
              <InfoRow label="Şifre" value="••••••••" />
            </SectionCard>

            {/* Location Section */}
            <SectionCard
              title="Konum (Harita)"
              onEdit={openLocationModal}
            >
              <InfoRow label="Enlem" value={form.latitude || "-"} />
              <InfoRow label="Boylam" value={form.longitude || "-"} />
            </SectionCard>

            {/* Commission Info (Read-only) */}
            <div className="rounded-2xl border border-neutral-200/70 bg-white p-6">
              <div className="mb-4 text-sm font-semibold text-neutral-900">Komisyon Bilgisi</div>
              <div className="space-y-2 text-sm">
                <InfoRow label="Komisyon Oranı" value={commissionRate != null ? `%${commissionRate}` : "-"} />
                <InfoRow label="Açıklama" value={commissionRateDescription || "-"} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="rounded-2xl border border-neutral-200/70 bg-white p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-40 w-40">
                <Image
                  src="/Brand/yuksi.png"
                  alt="profile"
                  unoptimized
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

      {/* Modals */}
      {generalModalOpen && (
        <Modal
          title="Genel Bilgileri Düzenle"
          onClose={() => setGeneralModalOpen(false)}
          onSave={() => saveSection({
            firstName: tempForm.firstName,
            lastName: tempForm.lastName,
            resume: tempForm.resume,
          })}
          saving={saving}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">Ad</label>
              <input
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.firstName || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">Soyad</label>
              <input
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.lastName || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">Özgeçmiş</label>
              <input
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.resume || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, resume: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}

      {contactModalOpen && (
        <Modal
          title="İletişim & Adres Bilgilerini Düzenle"
          onClose={() => setContactModalOpen(false)}
          onSave={() => {
            if (!(Number(tempForm.countryId) >= 1)) return setErrMsg("Lütfen ülke seçin.");
            if (!(Number(tempForm.stateId) >= 1)) return setErrMsg("Lütfen il seçin.");
            if (!(Number(tempForm.cityId) >= 1)) return setErrMsg("Lütfen ilçe seçin.");
            saveSection({
              phone: tempForm.phone,
              email: tempForm.email,
              countryId: tempForm.countryId,
              stateId: tempForm.stateId,
              cityId: tempForm.cityId,
              fullAddress: tempForm.fullAddress,
            });
          }}
          saving={saving}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">Telefon</label>
              <input
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.phone || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">E-Posta</label>
              <input
                type="email"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.email || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">Ülke</label>
              <select
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.countryId || 0}
                onChange={(e) => onPickCountry(Number(e.target.value))}
              >
                <option value={0}>{geoLoading.countries ? "Ülkeler yükleniyor..." : "Ülke seçin"}</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">İl</label>
              <select
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.stateId || 0}
                disabled={!(tempForm.countryId && tempForm.countryId >= 1)}
                onChange={(e) => onPickState(Number(e.target.value))}
              >
                <option value={0}>
                  {!(tempForm.countryId && tempForm.countryId >= 1)
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
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">İlçe</label>
              <select
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.cityId || 0}
                disabled={!(tempForm.stateId && tempForm.stateId >= 1)}
                onChange={(e) => setTempForm((p) => ({ ...p, cityId: Number(e.target.value) }))}
              >
                <option value={0}>
                  {!(tempForm.stateId && tempForm.stateId >= 1)
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
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">Adres</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.fullAddress || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, fullAddress: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}

      {taxModalOpen && (
        <Modal
          title="Vergi/Finans Bilgilerini Düzenle"
          onClose={() => setTaxModalOpen(false)}
          onSave={() => saveSection({
            tax_office: tempForm.tax_office,
            tax_number: tempForm.tax_number,
            iban: tempForm.iban,
          })}
          saving={saving}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">Vergi Dairesi</label>
              <input
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.tax_office || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, tax_office: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">Vergi No</label>
              <input
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.tax_number || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, tax_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">IBAN</label>
              <input
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.iban || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, iban: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}

      {passwordModalOpen && (
        <Modal
          title="Şifre Güncelle"
          onClose={() => setPasswordModalOpen(false)}
          onSave={() => {
            const pw = String(tempForm.password || "").trim();
            if (!pw) return setErrMsg("Lütfen yeni şifre girin.");
            saveSection({ password: pw });
          }}
          saving={saving}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-800">Yeni Şifre</label>
              <input
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                value={tempForm.password || ""}
                onChange={(e) => setTempForm((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="text-xs text-neutral-600">
              Şifre sadece doluysa güncellenecektir.
            </div>
          </div>
        </Modal>
      )}

      {locationModalOpen && (
        <Modal
          title="Konum Bilgilerini Düzenle"
          onClose={() => setLocationModalOpen(false)}
          onSave={() => saveSection({
            latitude: tempForm.latitude,
            longitude: tempForm.longitude,
            fullAddress: tempForm.fullAddress,
          })}
          saving={saving}
          large
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-800">Enlem</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                  value={tempForm.latitude || ""}
                  onChange={(e) => setTempForm((p) => ({ ...p, latitude: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-800">Boylam</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                  value={tempForm.longitude || ""}
                  onChange={(e) => setTempForm((p) => ({ ...p, longitude: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <MapPicker
                label="Haritada Konum Seç"
                value={
                  tempForm.latitude && tempForm.longitude
                    ? { lat: Number(tempForm.latitude), lng: Number(tempForm.longitude) }
                    : null
                }
                onChange={onPickFromMap}
                defaultCenter={{ lat: 41.015137, lng: 28.97953 }}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ========= Components =========

function SectionCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-neutral-900">{title}</div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
        >
          <Pencil className="h-4 w-4" />
          Düzenle
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between text-sm">
      <span className="font-medium text-neutral-600">{label}:</span>
      <span className="text-neutral-900 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function Modal({
  title,
  onClose,
  onSave,
  saving,
  children,
  large = false,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${large ? "max-w-3xl" : "max-w-lg"} rounded-2xl border border-neutral-200 bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-5 w-5 text-neutral-600" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {children}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
