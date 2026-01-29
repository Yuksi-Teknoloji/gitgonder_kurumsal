// src/app/dashboard/corporate/subscribe/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";

type ApiPackage = {
  packageId: string;
  packageName: string;
  description?: string | null;
  price: number; // unit price (₺/paket) varsayımı
  durationDays: number;
};

async function readJson<T = any>(res: Response): Promise<T> {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : (null as any);
  } catch {
    return t as any;
  }
}

function decodeJwtPayload(token: string): any | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getBearerToken() {
  try {
    return (
      getAuthToken() ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      ""
    );
  } catch {
    return getAuthToken() || "";
  }
}

function resolveCorporateUserId(bearer: string): string {
  const payload = decodeJwtPayload(bearer);
  const id = payload?.sub || payload?.userId || "";
  return typeof id === "string" ? id : "";
}

async function apiGetPackages(bearer: string): Promise<ApiPackage[]> {
  const res = await fetch("/yuksi/kurumsal/packages?limit=500&offset=0", {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: `Bearer ${bearer}` },
  });

  const json: any = await readJson(res);
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || json?.detail || `HTTP ${res.status}`);
  }
  return Array.isArray(json?.data) ? (json.data as ApiPackage[]) : [];
}

function onlyDigits(s: string) {
  return (s || "").replace(/\D+/g, "");
}

type PaymentMethod = "card" | "eft" | "cash";

type PayForm = {
  paymentMethod: PaymentMethod;

  email: string;

  cardHolderName: string; // Kart üzerindeki isim
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvv: string;

  fullName: string; // Ad Soyad
  phone: string;
  address: string;
};

export default function CorporateSubscribePage() {
  const router = useRouter();

  const [err, setErr] = React.useState<string | null>(null);

  const [packagesLoading, setPackagesLoading] = React.useState(true);
  const [packagesErr, setPackagesErr] = React.useState<string | null>(null);
  const [packages, setPackages] = React.useState<ApiPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = React.useState<string>("");

  // modal
  const [payOpen, setPayOpen] = React.useState(false);
  const [paySubmitting, setPaySubmitting] = React.useState(false);

  // polling
  const [polling, setPolling] = React.useState(false);
  const pollRef = React.useRef<number | null>(null);

  const selectedPackage = React.useMemo(
    () => packages.find((p) => p.packageId === selectedPackageId) || null,
    [packages, selectedPackageId]
  );

  const [payForm, setPayForm] = React.useState<PayForm>({
    paymentMethod: "card",

    email: "",

    cardHolderName: "",
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvv: "",

    fullName: "",
    phone: "",
    address: "",
  });

  const unitPrice = selectedPackage?.price ?? 0;
  const totalAmount = Math.max(0, Math.round(unitPrice));

  // ===== initial packages load =====
  React.useEffect(() => {
    let alive = true;

    const run = async () => {
      const bearer = getBearerToken();
      if (!bearer) {
        router.replace("/");
        return;
      }

      setPackagesLoading(true);
      setPackagesErr(null);

      try {
        const list = await apiGetPackages(bearer);
        if (!alive) return;

        setPackages(list);
        setSelectedPackageId((prev) => prev || (list[0]?.packageId ?? ""));
      } catch (e: any) {
        if (!alive) return;
        setPackagesErr(e?.message || "Paketler alınamadı.");
      } finally {
        if (!alive) return;
        setPackagesLoading(false);
      }
    };

    run().catch(() => {
      if (!alive) return;
      setPackagesLoading(false);
      setPackagesErr("Paketler alınamadı.");
    });

    return () => {
      alive = false;
    };
  }, [router]);

  const createSubscriptionRequest = async (
    bearer: string,
    corporate_user_id: string,
    package_id: string
  ) => {
    const res = await fetch("/yuksi/kurumsal/package-subscriptions", {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      // quantity gerekiyorsa backend'e de gönder (senin endpoint şemana göre)
      body: JSON.stringify({ corporate_user_id, package_id }),
    });

    const json: any = await readJson(res);
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || `HTTP ${res.status}`);
    }

    const merchantOid = json?.data?.merchant_oid;
    if (!merchantOid) throw new Error("merchant_oid gelmedi");
    return merchantOid as string;
  };

  const createPaytrUrl = async (
    bearer: string,
    merchant_oid: string,
    pkg: ApiPackage,
    form: PayForm
  ) => {
    const payload: any = {
      id: (crypto as any)?.randomUUID?.() ?? "tmp",
      merchant_oid,
      email: form.email,

      // ödeme tutarı
      payment_amount: totalAmount, // backend kuruş bekliyorsa *100 yap
      currency: "TL",
      user_ip: "127.0.0.1",

      installment_count: 0,
      no_installment: 1,
      basket_json: JSON.stringify([[pkg.packageName, "1", String(totalAmount)]]),
      lang: "tr",
      test_mode: 0,
      non_3d: 0,

      // ekran görüntüsündeki alanlar
      cc_owner: form.cardHolderName,
      card_number: onlyDigits(form.cardNumber),
      expiry_month: form.expMonth,
      expiry_year: form.expYear,
      cvv: form.cvv,
      user_name: form.fullName,
      user_address: form.address,
      user_phone: onlyDigits(form.phone),
    };

    const res = await fetch("/yuksi/Paytr/Init", {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(payload),
    });

    const json: any = await readJson(res);
    if (!res.ok) throw new Error(`PayTR HTTP ${res.status}`);

    if (json?.status !== "success") {
      throw new Error(json?.reason || "PayTR init başarısız");
    }

    const url = String(json?.token || "");
    if (!url) throw new Error("PayTR url gelmedi");

    return url; // örn: https://yuksi.dev/paytr/....html
  };

  const stopPolling = React.useCallback(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
    setPolling(false);
  }, []);

  const startGuardPolling = React.useCallback(() => {
    if (pollRef.current) return;

    setPolling(true);

    const tick = async () => {
      const bearer = getBearerToken();
      if (!bearer) return;

      try {
        const res = await fetch("/yuksi/corporate/subscription-guard", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json", Authorization: `Bearer ${bearer}` },
        });

        const json: any = await readJson(res);
        if (res.ok && json?.data?.hasSubscription) {
          stopPolling();
          router.replace("/dashboard/corporate");
        }
      } catch {
        // sessiz
      }
    };

    tick();
    pollRef.current = window.setInterval(tick, 3000);
  }, [router, stopPolling]);

  React.useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const checkGuardAndEnter = async () => {
    const bearer = getBearerToken();
    if (!bearer) return;

    const res = await fetch("/yuksi/corporate/subscription-guard", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${bearer}` },
    });

    const json: any = await readJson(res);
    if (res.ok && json?.data?.hasSubscription) {
      router.replace("/dashboard/corporate");
    } else {
      setErr("Abonelik hala aktif görünmüyor. Ödeme tamamlandıysa birkaç saniye sonra tekrar deneyin.");
    }
  };

  const openPaymentModal = () => {
    setErr(null);
    if (!selectedPackage) {
      setErr("Lütfen bir paket seç.");
      return;
    }
    setPayOpen(true);
  };

  const submitPayment = async () => {
    setPaySubmitting(true);
    setErr(null);

    try {
      const bearer = getBearerToken();
      if (!bearer) throw new Error("No token");
      if (!selectedPackage) throw new Error("Lütfen bir paket seç.");

      if (!payForm.email) throw new Error("E-posta gerekli.");

      if (payForm.paymentMethod !== "card") {
        // burada eft/cash backend akışın varsa bağlarız
        throw new Error("Bu ödeme yöntemi henüz aktif değil. Şimdilik Kredi Kartı (PayTR) kullan.");
      }

      // kart validasyon
      if (!payForm.cardHolderName) throw new Error("Kart üzerindeki isim gerekli.");
      if (onlyDigits(payForm.cardNumber).length < 12) throw new Error("Kart numarası hatalı görünüyor.");
      if (!payForm.expMonth || payForm.expMonth.length < 1) throw new Error("Ay (AA) gerekli.");
      if (!payForm.expYear || payForm.expYear.length < 1) throw new Error("Yıl (YY) gerekli.");
      if (!payForm.cvv) throw new Error("CVV gerekli.");
      if (!payForm.fullName) throw new Error("Ad Soyad gerekli.");
      if (!payForm.phone) throw new Error("Telefon gerekli.");
      if (!payForm.address) throw new Error("Adres gerekli.");

      const corporate_user_id = resolveCorporateUserId(bearer);
      if (!corporate_user_id) throw new Error("Token içinden corporate_user_id okunamadı.");

      // 1) subscription request
      const merchant_oid = await createSubscriptionRequest(
        bearer,
        corporate_user_id,
        selectedPackage.packageId
      );

      // 2) paytr init -> url
      const url = await createPaytrUrl(bearer, merchant_oid, selectedPackage, payForm);

      // 3) yeni sekme
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) throw new Error("Popup engellendi. Pop-up izni verip tekrar dene.");

      setPayOpen(false);

      // 4) polling
      startGuardPolling();
    } catch (e: any) {
      setErr(e?.message || "Ödeme başlatılamadı.");
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="text-lg font-semibold text-neutral-900">Kurumsal Abonelik</div>
      <div className="mt-1 text-sm text-neutral-600">
        Aboneliğin yoksa panel kapalı. Paketi satın alıp aktif edince otomatik açılacak.
      </div>

      {err ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      {/* Paket seçimi */}
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-900">Paket Seç</div>
          <button
            type="button"
            onClick={async () => {
              const bearer = getBearerToken();
              if (!bearer) return;

              setPackagesLoading(true);
              setPackagesErr(null);

              try {
                const list = await apiGetPackages(bearer);
                setPackages(list);
                setSelectedPackageId((prev) => prev || (list[0]?.packageId ?? ""));
              } catch (e: any) {
                setPackagesErr(e?.message || "Paketler alınamadı.");
              } finally {
                setPackagesLoading(false);
              }
            }}
            className="text-xs font-semibold rounded-lg px-2 py-1 border border-neutral-200 hover:bg-neutral-50"
            disabled={packagesLoading}
          >
            {packagesLoading ? "Yükleniyor…" : "Yenile"}
          </button>
        </div>

        {packagesErr ? <div className="mt-3 text-sm text-rose-700">{packagesErr}</div> : null}

        {packagesLoading ? (
          <div className="mt-3 text-sm text-neutral-500">Paketler yükleniyor…</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {packages.map((p) => {
              const active = p.packageId === selectedPackageId;
              return (
                <button
                  key={p.packageId}
                  type="button"
                  onClick={() => setSelectedPackageId(p.packageId)}
                  className={[
                    "text-left rounded-xl border p-4 transition",
                    active
                      ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                      : "border-neutral-200 bg-white hover:bg-neutral-50",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900">{p.packageName}</div>
                      {p.description ? <div className="mt-1 text-xs text-neutral-600">{p.description}</div> : null}
                      <div className="mt-2 text-xs text-neutral-500">
                        Süre: <span className="font-semibold text-neutral-800">{p.durationDays} gün</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-neutral-900">₺ {p.price} / paket</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={openPaymentModal}
          disabled={!selectedPackage}
          className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          Satın Al
        </button>
      </div>

      {polling ? (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-white px-4 py-3">
          <div className="text-sm font-semibold text-neutral-900">Abonelik aktivasyonu kontrol ediliyor…</div>
          <div className="mt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={checkGuardAndEnter}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Manuel kontrol et
            </button>
          </div>
        </div>
      ) : null}

      {/* ===== Modal: Screenshot gibi ===== */}
      {payOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => !paySubmitting && setPayOpen(false)}
            aria-label="Kapat"
          />

          <div className="absolute left-1/2 top-1/2 w-[94vw] max-w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border border-neutral-200">
            <div className="px-6 py-5 border-b border-neutral-100">
              <div className="text-lg font-semibold text-neutral-900">Satın Alma</div>
            </div>

            <div className="px-6 py-5">
              {/* Top row: Seçili Paket + ödeme yöntemi */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="text-sm font-semibold text-neutral-800">Seçili Paket</div>
                  <div className="mt-2 text-sm font-semibold text-neutral-900">
                    {selectedPackage?.packageName}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    Süre:{" "}
                    <span className="font-semibold text-neutral-800">{selectedPackage?.durationDays} gün</span>
                  </div>
                  <div className="mt-3 text-sm text-neutral-700">
                    Ödenecek Tutar:{" "}
                    <span className="font-semibold">₺{totalAmount.toLocaleString("tr-TR")}</span>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="text-sm font-semibold text-neutral-800">Ödeme Yöntemi</div>

                  <div className="mt-3 flex flex-wrap items-center gap-10">
                    <label className="inline-flex items-center gap-2 text-sm text-neutral-800">
                      <input
                        type="radio"
                        name="pm"
                        checked={payForm.paymentMethod === "card"}
                        onChange={() => setPayForm((s) => ({ ...s, paymentMethod: "card" }))}
                      />
                      Kredi Kartı (PayTR)
                    </label>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-neutral-800">E-posta</div>
                    <input
                      value={payForm.email}
                      onChange={(e) => setPayForm((s) => ({ ...s, email: e.target.value }))}
                      placeholder="ornek@mail.com"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-neutral-800">Kart Numarası</div>
                    <input
                      value={payForm.cardNumber}
                      onChange={(e) => setPayForm((s) => ({ ...s, cardNumber: e.target.value }))}
                      placeholder="4111 1111 1111 1111"
                      inputMode="numeric"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-neutral-800">Ad Soyad</div>
                    <input
                      value={payForm.fullName}
                      onChange={(e) => setPayForm((s) => ({ ...s, fullName: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-neutral-800">Adres</div>
                    <input
                      value={payForm.address}
                      onChange={(e) => setPayForm((s) => ({ ...s, address: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-neutral-800">Kart Üzerindeki İsim</div>
                    <input
                      value={payForm.cardHolderName}
                      onChange={(e) => setPayForm((s) => ({ ...s, cardHolderName: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-sm font-semibold text-neutral-800">Ay (AA)</div>
                      <input
                        value={payForm.expMonth}
                        onChange={(e) => setPayForm((s) => ({ ...s, expMonth: e.target.value }))}
                        placeholder="12"
                        inputMode="numeric"
                        className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-neutral-800">Yıl (YY)</div>
                      <input
                        value={payForm.expYear}
                        onChange={(e) => setPayForm((s) => ({ ...s, expYear: e.target.value }))}
                        placeholder="27"
                        inputMode="numeric"
                        className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-neutral-800">CVV</div>
                      <input
                        value={payForm.cvv}
                        onChange={(e) => setPayForm((s) => ({ ...s, cvv: e.target.value }))}
                        placeholder="000"
                        inputMode="numeric"
                        className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-neutral-800">Telefon</div>
                    <input
                      value={payForm.phone}
                      onChange={(e) => setPayForm((s) => ({ ...s, phone: e.target.value }))}
                      placeholder="05xx xxx xx xx"
                      inputMode="tel"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
              </div>

              {/* Footer button */}
              <button
                type="button"
                onClick={submitPayment}
                disabled={paySubmitting || !selectedPackage}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {paySubmitting ? "Açılıyor…" : `Öde (₺${totalAmount.toLocaleString("tr-TR")})`}
              </button>

              <div className="mt-3 text-xs text-neutral-500">
                Ödeme sayfası yeni sekmede açılır. Pop-up engeli varsa izin ver.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
