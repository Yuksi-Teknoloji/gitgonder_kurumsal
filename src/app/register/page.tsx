// src/app/register/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { CorporateRegisterInput } from "@/src/types/auth";

// Türkçe alfabeye göre sıralama fonksiyonu
const turkishSort = <T extends { name: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
  );
};

interface State {
  id: number;
  name: string;
}

interface City {
  id: number;
  name: string;
}

export default function CorporateRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // İl ve ilçe state'leri
  const [states, setStates] = React.useState<State[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);
  const [selectedStateId, setSelectedStateId] = React.useState<number | null>(null);
  const [statesLoading, setStatesLoading] = React.useState(false);
  const [citiesLoading, setCitiesLoading] = React.useState(false);

  const [form, setForm] = React.useState<CorporateRegisterInput>({
    companyName: "",
    taxOffice: "",
    vkn: "",
    city: "",
    district: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
    neighborhood: "",
    street: "",
    buildingNumber: "",
    apartmentNumber: "",
    floor: "",
    postalCode: "",
    acceptedTos: false,
    acceptedKvkk: false,
  });

  // İlleri yükle
  React.useEffect(() => {
    const fetchStates = async () => {
      setStatesLoading(true);
      try {
        const res = await fetch(
          "https://www.yuksi.dev/geo/states?country_id=225&limit=100&offset=0",
          {
            headers: { accept: "application/json" },
          }
        );
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setStates(turkishSort(data));
        }
      } catch (err) {
        toast.error("İller yüklenirken hata oluştu");
      } finally {
        setStatesLoading(false);
      }
    };
    fetchStates();
  }, []);

  // İl seçildiğinde ilçeleri yükle
  React.useEffect(() => {
    if (!selectedStateId) {
      setCities([]);
      return;
    }

    const fetchCities = async () => {
      setCitiesLoading(true);
      try {
        const res = await fetch(
          `https://www.yuksi.dev/geo/cities?state_id=${selectedStateId}&limit=100&offset=0`,
          {
            headers: { accept: "application/json" },
          }
        );
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setCities(turkishSort(data));
        }
      } catch (err) {
        toast.error("İlçeler yüklenirken hata oluştu");
      } finally {
        setCitiesLoading(false);
      }
    };
    fetchCities();
  }, [selectedStateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zorunlu alan kontrolü
    const requiredFields: Array<{
      key: keyof CorporateRegisterInput;
      label: string;
    }> = [
      { key: "companyName", label: "Firma Adı" },
      { key: "taxOffice", label: "Vergi Dairesi" },
      { key: "vkn", label: "VKN" },
      { key: "city", label: "İl" },
      { key: "district", label: "İlçe" },
      { key: "firstName", label: "Ad" },
      { key: "lastName", label: "Soyad" },
      { key: "email", label: "E-posta" },
      { key: "phone", label: "Telefon" },
      { key: "password", label: "Şifre" },
      { key: "passwordConfirm", label: "Şifre Tekrar" },
    ];

    const missingFields = requiredFields.filter((field) => {
      const value = form[field.key];
      if (typeof value === "string") {
        return !value || value.trim() === "";
      }
      return !value;
    });

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map((f) => f.label).join(", ");
      toast.error(`Lütfen aşağıdaki zorunlu alanları doldurun: ${fieldNames}`);
      return;
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Lütfen geçerli bir e-posta adresi giriniz.");
      return;
    }

    // Şifre validasyonları
    if (form.password !== form.passwordConfirm) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    // VKN validasyonu
    if (form.vkn.length !== 10) {
      toast.error("VKN 10 haneli olmalıdır.");
      return;
    }

    // Telefon validasyonu
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      toast.error("Telefon numarası en az 7 haneli olmalıdır.");
      return;
    }

    // Onay kutuları kontrolü
    if (!form.acceptedTos) {
      toast.error("Kullanım şartlarını kabul etmelisiniz.");
      return;
    }

    if (!form.acceptedKvkk) {
      toast.error("KVKK metnini kabul etmelisiniz.");
      return;
    }

    setLoading(true);

    try {
      // JSON body oluştur - API dokümantasyonuna uygun field isimleri
      const payload = {
        company_name: form.companyName,
        tax_office: form.taxOffice,
        vkn: form.vkn,
        city: form.city,
        district: form.district,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      };

      // Optional address fields
      if (form.neighborhood)
        Object.assign(payload, { neighborhood: form.neighborhood });
      if (form.street) Object.assign(payload, { street: form.street });
      if (form.buildingNumber)
        Object.assign(payload, { building_number: form.buildingNumber });
      if (form.apartmentNumber)
        Object.assign(payload, { apartment_number: form.apartmentNumber });
      if (form.floor) Object.assign(payload, { floor: form.floor });
      if (form.postalCode)
        Object.assign(payload, { postal_code: form.postalCode });

      const res = await fetch("/yuksi/Auth/register/corporate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Kayıt başarısız.");
      }

      // API'den gelen response'u handle et: { success, data: { status, accessToken, ... } }
      const { status, accessToken, refreshToken } = data.data || {};

      // Token'ı cookie'ye kaydet
      if (accessToken) {
        await fetch("/api/auth/set-cookie", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: accessToken }),
        });
      }

      // Refresh token'ı localStorage'a kaydet (cookie'ye kaydetmiyoruz)
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }

      setSuccess(true);
      toast.success("Kayıt başarılı! Yönlendiriliyorsunuz...");

      // Status'a göre yönlendirme
      setTimeout(() => {
        if (status === "PASSIVE_NO_PAYMENT") {
          router.push("/onboarding/setup-fee");
        } else if (status === "PENDING_APPROVAL") {
          router.push("/onboarding/setup-fee");
        } else if (status === "REJECTED") {
          router.push("/onboarding/setup-fee");
        } else if (status === "ACTIVE_READY") {
          router.push("/dashboard");
        } else if (status === "SUBSCRIBED") {
          router.push("/dashboard");
        } else if (status === "SUSPENDED") {
          router.push("/suspended");
        } else {
          // Fallback
          router.push("/onboarding/setup-fee");
        }
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message || "Kayıt sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-green-200 p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-neutral-900">
              Kayıt Başarılı!
            </h1>
            <p className="mt-3 text-neutral-600">
              Hesabınız oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 sm:py-12 px-4 bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200">
          <div className="border-b border-neutral-200 px-4 sm:px-6 md:px-8 py-5 sm:py-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">
              Kurumsal Üyelik Kaydı
            </h1>
            <p className="mt-2 text-sm sm:text-base text-neutral-600">
              Kurumsal üyelik için aşağıdaki bilgileri doldurun
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="px-4 sm:px-6 md:px-8 py-6 space-y-8"
          >
            {/* Firma Bilgileri */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                Firma Bilgileri
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Firma Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) =>
                      setForm({ ...form, companyName: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Şirket Adı A.Ş."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Vergi Dairesi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={form.taxOffice}
                      onChange={(e) =>
                        setForm({ ...form, taxOffice: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Kadıköy"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      VKN (10 haneli) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={form.vkn}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setForm({ ...form, vkn: value });
                      }}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      İl <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedStateId || ""}
                      onChange={(e) => {
                        const stateId = e.target.value ? Number(e.target.value) : null;
                        setSelectedStateId(stateId);
                        const selectedState = states.find((s) => s.id === stateId);
                        setForm({
                          ...form,
                          city: selectedState?.name || "",
                          district: "",
                        });
                        setCities([]);
                      }}
                      disabled={statesLoading}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white disabled:bg-neutral-100"
                    >
                      <option value="">
                        {statesLoading ? "Yükleniyor..." : "İl Seçiniz"}
                      </option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      İlçe <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                      disabled={!selectedStateId || citiesLoading}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white disabled:bg-neutral-100"
                    >
                      <option value="">
                        {citiesLoading
                          ? "Yükleniyor..."
                          : !selectedStateId
                            ? "Önce il seçiniz"
                            : "İlçe Seçiniz"}
                      </option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Mahalle
                    </label>
                    <input
                      type="text"
                      value={form.neighborhood}
                      onChange={(e) =>
                        setForm({ ...form, neighborhood: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Caferağa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Sokak/Cadde
                    </label>
                    <input
                      type="text"
                      value={form.street}
                      onChange={(e) =>
                        setForm({ ...form, street: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Moda Caddesi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Bina No
                    </label>
                    <input
                      type="text"
                      value={form.buildingNumber}
                      onChange={(e) =>
                        setForm({ ...form, buildingNumber: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="123"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Daire No
                    </label>
                    <input
                      type="text"
                      value={form.apartmentNumber}
                      onChange={(e) =>
                        setForm({ ...form, apartmentNumber: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="5"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Kat
                    </label>
                    <input
                      type="text"
                      value={form.floor}
                      onChange={(e) =>
                        setForm({ ...form, floor: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="3"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Posta Kodu
                    </label>
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(e) =>
                        setForm({ ...form, postalCode: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="34710"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* İletişim Bilgileri */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                Yetkili Kişi Bilgileri
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Ad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Ali"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Soyad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Yılmaz"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    E-posta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="firma@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Telefon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
              </div>
            </div>

            {/* Şifre */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                Şifre
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Şifre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Şifre Tekrar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.passwordConfirm}
                    onChange={(e) =>
                      setForm({ ...form, passwordConfirm: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Onaylar */}
            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={form.acceptedTos}
                  onChange={(e) =>
                    setForm({ ...form, acceptedTos: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 text-orange-600 border-neutral-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-neutral-700">
                  <a
                    href="/tos"
                    target="_blank"
                    className="text-orange-600 hover:underline"
                  >
                    Kullanım Şartları
                  </a>
                  'nı okudum ve kabul ediyorum.{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={form.acceptedKvkk}
                  onChange={(e) =>
                    setForm({ ...form, acceptedKvkk: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 text-orange-600 border-neutral-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-neutral-700">
                  <a
                    href="/kvkk"
                    target="_blank"
                    className="text-orange-600 hover:underline"
                  >
                    KVKK Aydınlatma Metni
                  </a>
                  'ni okudum ve kabul ediyorum.{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            {/* Submit */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full sm:w-auto px-6 py-3 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100 transition"
              >
                Giriş Sayfasına Dön
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Kaydediliyor..." : "Kayıt Ol"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
