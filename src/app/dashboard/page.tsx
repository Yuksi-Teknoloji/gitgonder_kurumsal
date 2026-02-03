"use client";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/src/utils/auth";
import { decodeJwt, isExpired, roleSegment } from "@/src/utils/jwt";
import { useEffect, useState } from "react";

/* ========= Helpers (sadece isim çekmek için) ========= */
async function readJson<T = any>(res: Response): Promise<T> {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : (null as any);
  } catch {
    return t as any;
  }
}

export default function CorporateHome() {
  const [token, setToken] = useState<string | null>(null);

  // ✅ Profil adı için state
  const [fullName, setFullName] = useState<string>("");

  // ✅ Status için state
  const [userStatus, setUserStatus] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAuthToken());
  }, []);

  // ✅ Token geldikten sonra profile endpointine istek at
  useEffect(() => {
    const run = async () => {
      if (!token) return;

      try {
        const res = await fetch("/yuksi/corporate/profile", {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        // 401/403 ise zaten aşağıda role/auth kontrolü var ama burada da güvenli olsun
        if (res.status === 401 || res.status === 403) return;

        const j: any = await readJson(res);

        const fn = String(j?.firstName || "").trim();
        const ln = String(j?.lastName || "").trim();
        const nm = [fn, ln].filter(Boolean).join(" ").trim();

        if (nm) setFullName(nm);
      } catch {
        // sessiz geç
      }
    };

    run();
  }, [token]);

  // ✅ Status kontrolü
  useEffect(() => {
    const checkStatus = async () => {
      if (!token) return;

      try {
        const res = await fetch("/api/onboarding/status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const json = await readJson(res);
          if (json?.data?.status) {
            setUserStatus(json.data.status);
          }
        }
      } catch {
        // sessiz geç
      }
    };

    checkStatus();
  }, [token]);

  if (token === null) {
    return null;
  }

  const claims = decodeJwt(token);

  if (!claims || isExpired(claims)) {
    redirect("/");
  }

  const role = String(roleSegment(claims.userType) || "").toLowerCase();

  console.log("[Dashboard Page] Role check:", role);

  // TEMPORARY: Backend "business" olarak kaydediyor
  if (role !== "corporate" && role !== "business") {
    console.log("[Dashboard Page] Role mismatch, redirecting to /");
    redirect("/");
  }

  // SUBSCRIBED veya ACTIVE_READY ise sadece hoşgeldin mesajı göster
  if ( userStatus === "SUBSCRIBED" || userStatus === "ACTIVE_READY" ) {
    return (
      <div className="rounded-2xl bg-white p-5 sm:p-6 shadow border border-neutral-200">
        <div className="text-lg sm:text-xl font-semibold text-neutral-900">
          Kurumsal Üye Sayfasına Hoşgeldin{fullName ? `, ${fullName}` : ""}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 sm:p-6 shadow border border-neutral-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center shrink-0">
              🏢
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-semibold text-neutral-900 truncate">
                Kurumsal Üye Sayfasına Hoşgeldin{fullName ? `, ${fullName}` : ""}
              </div>
              <div className="mt-1 text-sm text-neutral-600">
                Kurulumu tamamlayınca sistemi eksiksiz ve sorunsuz kullanabilirsiniz.
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/auto-cargo/create-cargo"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap"
          >
            Kargo Oluştur
          </Link>
          <Link
            href="/dashboard/profile"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 whitespace-nowrap"
          >
            Profile Git
          </Link>
        </div>
      </div>

      {/* Steps */}
      <div className="mt-6 rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Kurulum Adımları</div>
            <div className="mt-1 text-xs text-neutral-600">
              Aşağıdaki adımları sırayla tamamlayarak kısa sürede kullanıma başlayabilirsiniz.
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl border border-neutral-200 bg-white flex items-center justify-center">
              ✅
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Step 1 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition soft-card">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-neutral-900">Profil Bilgilerini Tamamla</div>
                <div className="mt-1 text-sm text-neutral-700">
                  <Link
                    href="/dashboard/profile"
                    className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-800"
                  >
                    Profil Yönetimi
                  </Link>{" "}
                  sayfasına girip boş alanları “Düzenle” butonlarıyla doldurun ve en aşağıdaki kaydet butonuna
                  tıklayın.
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                    İletişim & Adres
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                    Vergi & Finans
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard/profile"
                className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
              >
                Aç
              </Link>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition soft-card">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-neutral-900">Yüksi-Kargo Kaydını Başlat</div>
                <div className="mt-1 text-sm text-neutral-700">
                  Profil bilgilerini tamamladıktan sonra <span className="font-semibold">yüksi-kargo</span> kaydınızın
                  başlatılması için iletişime geçin.
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                    Kayıt aktivasyonu
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                    Hesap doğrulama
                  </span>
                </div>
              </div>

              <div className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-500">
                Bilgi
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition soft-card">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-neutral-900">Gönderici Konumunu Ekle</div>
                <div className="mt-1 text-sm text-neutral-700">
                  Kayıt oluşturulduktan sonra{" "}
                  <Link
                    href="/dashboard/auto-cargo/my-location"
                    className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-800"
                  >
                    Konumum
                  </Link>{" "}
                  sayfasından gönderici konumunuzu ekleyin.
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                    Adres doğruluğu
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                    Gönderici bilgisi
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard/auto-cargo/my-location"
                className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
              >
                Aç
              </Link>
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition soft-card">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                4
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-neutral-900">Kargo Paketi (Kutu) Ekle</div>
                <div className="mt-1 text-sm text-neutral-700">
                  Konum ekledikten sonra{" "}
                  <Link
                    href="/dashboard/auto-cargo/cargo-package"
                    className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-800"
                  >
                    Kargo Paketi Ekle
                  </Link>{" "}
                  sayfasından bir paket oluşturun.
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                    Boyutlar
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                    Hacim hesabı
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard/auto-cargo/cargo-package"
                className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
              >
                Aç
              </Link>
            </div>
          </div>

          {/* Step 5 (full width) */}
          <div className="lg:col-span-2 rounded-2xl border border-neutral-200 bg-green-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  5
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">Artık Kargo Oluşturabilirsin</div>
                  <div className="mt-1 text-sm text-neutral-700">
                    Paket ekledikten sonra kargo oluşturarak sistemi sorunsuz şekilde kullanabilirsiniz.
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard/auto-cargo/create-cargo"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
              >
                İlk Kargonu Oluştur
              </Link>
            </div>
          </div>
        </div>

        {/* Footer thanks */}
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-emerald-900">YÜKSİ'yi tercih ettiğiniz için teşekkür ederiz</div>
          <div className="text-xs text-emerald-800">Destek gerekirse bizimle iletişime geçebilirsiniz.</div>
        </div>
      </div>
    </div>
  );
}
