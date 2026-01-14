// src/app/onboarding/setup-fee/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";

type UserStatus =
  | "PASSIVE_NO_PAYMENT"
  | "PENDING_APPROVAL"
  | "ACTIVE_READY"
  | "SUBSCRIBED"
  | "REJECTED"
  | "SUSPENDED";

const FALLBACK_NET_PRICE = 12000; // Net tutar (TL) - backend'ten fiyat gelmezse
const FALLBACK_VAT_RATE = 0.2; // KDV oranı %20 - backend'ten oran gelmezse

// Banka hesap bilgileri tipi
type BankAccount = {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name?: string | null;
  account_number?: string | null;
};

type BankAccountsResponse =
  | BankAccount[]
  | {
      success: boolean;
      message?: string;
      data?: {
        bank_accounts?: BankAccount[];
        gross_price?: number; // net tutar gibi kullanıyoruz (ör: 10000)
        vat_rate?: number; // yüzde (ör: 20)
      };
    };

async function readJson<T = any>(res: Response): Promise<T> {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : (null as any);
  } catch {
    return t as any;
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

export default function SetupFeePage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<UserStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = React.useState(true);
  const [netPrice, setNetPrice] = React.useState<number | null>(null);
  const [vatRatePct, setVatRatePct] = React.useState<number | null>(null);

  const handlePaymentConfirmation = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const bearer = getBearerToken();
      if (!bearer) {
        throw new Error("Token bulunamadı.");
      }

      console.log("=== REQUESTING ACTIVATION ===");
      console.log("Bearer Token:", bearer.substring(0, 20) + "...");

      const res = await fetch("/api/onboarding/request-activation", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
      });

      const json = await readJson(res);

      console.log("=== ACTIVATION RESPONSE (Client) ===");
      console.log("Status Code:", res.status);
      console.log("Response:", JSON.stringify(json, null, 2));
      console.log("=====================================");

      if (!res.ok) {
        throw new Error(json?.message || "Aktivasyon talebi başarısız.");
      }

      // Başarılı talep - status'u güncelle
      router.refresh();
      setStatus("PENDING_APPROVAL");
    } catch (e: any) {
      console.error("=== ACTIVATION ERROR (Client) ===");
      console.error(e);
      console.error("==================================");
      setError(
        e?.message || "Aktivasyon talebi gönderilirken bir hata oluştu."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Banka hesap bilgilerini çek
  React.useEffect(() => {
    let alive = true;

    const fetchBankAccounts = async () => {
      try {
        console.log("=== FETCHING BANK ACCOUNTS (Client) ===");
        console.log("URL: /api/bank-accounts");
        console.log("Timestamp:", new Date().toISOString());

        const res = await fetch("/api/bank-accounts", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const rawText = await res.text();
        console.log("=== RAW RESPONSE (Client) ===");
        console.log("Status Code:", res.status);
        console.log("Status Text:", res.statusText);
        console.log("Raw Text Length:", rawText.length);
        console.log("Raw Text Preview:", rawText.substring(0, 500));
        console.log("==============================");

        // Parse the rawText directly since we already read the body
        let json: any = {};
        try {
          json = rawText ? JSON.parse(rawText) : {};
        } catch (parseError) {
          console.error("=== JSON PARSE ERROR (Client) ===");
          console.error("Parse Error:", parseError);
          console.error("Raw Text:", rawText);
          console.error("================================");
        }

        console.log("=== BANK ACCOUNTS RESPONSE (Client) ===");
        console.log("Status Code:", res.status);
        console.log(
          "Response Type:",
          Array.isArray(json) ? "Array" : typeof json
        );
        console.log("Is Array:", Array.isArray(json));
        console.log("Has data property:", !!json?.data);
        console.log("Is data Array:", Array.isArray(json?.data));
        console.log("Full Response:", JSON.stringify(json, null, 2));
        console.log("=======================================");

        if (!alive) return;

        if (!res.ok) {
          console.warn("=== BANK ACCOUNTS ERROR (Client) ===");
          console.warn("Status Code:", res.status);
          console.warn(
            "Error Message:",
            json?.message || json?.error || "Unknown error"
          );
          console.warn("Full Error Response:", JSON.stringify(json, null, 2));
          console.warn("====================================");
          // Hata durumunda da devam et, sadece log'la
          return;
        }

        // Backend'den gelen veriyi işle
        console.log("=== PARSING BANK ACCOUNTS ===");
        console.log("Raw json:", json);
        console.log("Is json array?", Array.isArray(json));
        console.log("json.data:", json?.data);
        console.log("Is json.data array?", Array.isArray(json?.data));

        const parsed = json as BankAccountsResponse;

        // Yeni model: { success, data: { bank_accounts, gross_price, vat_rate } }
        const accounts: BankAccount[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.data?.bank_accounts)
          ? parsed.data.bank_accounts
          : // Eski olası model: { data: [...] }
          Array.isArray((parsed as any)?.data)
          ? (parsed as any).data
          : [];

        if (!Array.isArray(parsed) && parsed?.data) {
          if (typeof parsed.data.gross_price === "number") {
            setNetPrice(parsed.data.gross_price);
          }
          if (typeof parsed.data.vat_rate === "number") {
            setVatRatePct(parsed.data.vat_rate);
          }
        }

        console.log("Parsed accounts count:", accounts.length);
        console.log("Parsed accounts:", accounts);

        if (accounts.length > 0) {
          console.log("=== SETTING BANK ACCOUNTS ===");
          accounts.forEach((account, index) => {
            console.log(`Account ${index + 1}:`, {
              id: account.id,
              bank_name: account.bank_name,
              account_holder: account.account_holder,
              iban: account.iban,
              branch_name: account.branch_name,
              account_number: account.account_number,
            });
          });
          console.log("=============================");
          setBankAccounts(accounts);
        } else {
          console.warn("=== NO BANK ACCOUNTS FOUND ===");
          console.warn("No accounts parsed from response");
          console.warn("==============================");
        }
      } catch (e) {
        console.error("=== BANK ACCOUNTS ERROR (Client) ===");
        console.error("Error Type:", typeof e);
        console.error("Error:", e);
        console.error("Error Message:", (e as any)?.message);
        console.error("Error Stack:", (e as any)?.stack);
        console.error("====================================");
      } finally {
        if (!alive) return;
        setLoadingBankAccounts(false);
        console.log("=== BANK ACCOUNTS FETCH COMPLETED ===");
        console.log("Loading state set to false");
        console.log("=====================================");
      }
    };

    fetchBankAccounts();

    return () => {
      alive = false;
    };
  }, []);

  // Status kontrolü
  React.useEffect(() => {
    let alive = true;

    const checkStatus = async () => {
      const bearer = getBearerToken();
      if (!bearer) {
        router.replace("/");
        return;
      }

      try {
        if (!alive) return;

        console.log("=== FETCHING STATUS ===");
        console.log("Bearer Token:", bearer.substring(0, 20) + "...");

        const res = await fetch("/api/onboarding/status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${bearer}`,
            "Content-Type": "application/json",
          },
        });

        const json = await readJson(res);

        console.log("=== STATUS RESPONSE (Client) ===");
        console.log("Status Code:", res.status);
        console.log("Response:", JSON.stringify(json, null, 2));
        console.log("================================");

        if (!res.ok || !json.success) {
          throw new Error(json?.message || "Status alınamadı.");
        }

        // Backend'den gelen status'u set et: { success: true, data: { status: "..." } }
        const userStatus = json.data?.status;
        if (userStatus) {
          setStatus(userStatus as UserStatus);
        } else {
          throw new Error("Status bilgisi bulunamadı.");
        }
      } catch (e) {
        console.error("=== STATUS ERROR (Client) ===");
        console.error(e);
        console.error("=============================");
        if (!alive) return;
        router.replace("/");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    checkStatus();

    return () => {
      alive = false;
    };
  }, [router]);

  // SUSPENDED durumunda suspended sayfasına yönlendir
  React.useEffect(() => {
    if (status === "SUSPENDED") {
      router.replace("/suspended");
    }
  }, [status, router]);

  if (loading) {
    return (
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
        <div className="text-center text-sm text-neutral-600">
          Yükleniyor...
        </div>
      </div>
    );
  }

  if (status === "SUSPENDED") {
    return (
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
        <div className="text-center text-sm text-neutral-600">
          Yönlendiriliyor...
        </div>
      </div>
    );
  }

  // PENDING_APPROVAL - Bekleme ekranı
  if (status === "PENDING_APPROVAL") {
    return (
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-neutral-900">
            Ödemeniz Kontrol Ediliyor
          </h1>
          <p className="mt-3 text-neutral-600">
            Dekontunuz başarıyla yüklendi. Admin ekibimiz ödemenizi kontrol
            ediyor.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Onay süreci genellikle 1-2 iş günü içinde tamamlanır.
          </p>

          <div className="mt-8 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-700">
              Onaylandığında otomatik olarak panele erişebileceksiniz.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // REJECTED - Ödeme reddedildi, yeniden ödeme formu
  if (status === "REJECTED") {
    // Backend model: net tutar = gross_price, KDV oranı = vat_rate(%)
    const vatRateFraction =
      typeof vatRatePct === "number" ? vatRatePct / 100 : FALLBACK_VAT_RATE;
    const basePrice =
      typeof netPrice === "number" ? netPrice : FALLBACK_NET_PRICE;
    const vatAmount = basePrice * vatRateFraction;
    const totalAmount = basePrice + vatAmount;

    return (
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl border border-neutral-200">
        <div className="border-b border-neutral-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-neutral-900">
            Ödeme Reddedildi
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Önceki ödemeniz reddedildi. Lütfen aşağıdaki bilgileri kontrol
            ederek yeniden ödeme yapın.
          </p>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Uyarı Mesajı */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Ödeme Reddedildi
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Önceki ödemeniz onaylanmadı. Lütfen banka hesap bilgilerini ve
                  ödeme tutarını kontrol ederek yeniden ödeme yapın.
                  Dekontunuzda açıklama kısmına ad-soyad ve telefon numaranızı
                  yazmayı unutmayın.
                </p>
              </div>
            </div>
          </div>

          {/* Tutar Bilgisi */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-700">Net Tutar</span>
                <span className="text-lg font-semibold text-neutral-900">
                  ₺{basePrice.toLocaleString("tr-TR")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-700">
                  KDV (%{(vatRateFraction * 100).toFixed(0)})
                </span>
                <span className="text-lg font-semibold text-neutral-900">
                  ₺{vatAmount.toLocaleString("tr-TR")}
                </span>
              </div>
              <div className="pt-3 border-t border-orange-300">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-neutral-900">
                    Toplam Ödenecek Tutar
                  </span>
                  <span className="text-2xl font-bold text-orange-600">
                    ₺{totalAmount.toLocaleString("tr-TR")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* IBAN Bilgisi */}
          <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Havale/EFT Bilgileri
            </h2>
            {loadingBankAccounts ? (
              <div className="text-center text-sm text-neutral-600 py-4">
                Banka hesap bilgileri yükleniyor...
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-center text-sm text-neutral-600 py-4">
                Banka hesap bilgisi bulunamadı.
              </div>
            ) : (
              <div className="space-y-6">
                {bankAccounts.map((account, index) => (
                  <div
                    key={account.id || index}
                    className="bg-white rounded-lg p-4 border border-neutral-200"
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wide">
                          Banka
                        </div>
                        <div className="text-sm font-semibold text-neutral-900 mt-1">
                          {account.bank_name}
                        </div>
                      </div>
                      {account.branch_name && (
                        <div>
                          <div className="text-xs text-neutral-500 uppercase tracking-wide">
                            Şube
                          </div>
                          <div className="text-sm font-semibold text-neutral-900 mt-1">
                            {account.branch_name}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wide">
                          Hesap Sahibi
                        </div>
                        <div className="text-sm font-semibold text-neutral-900 mt-1">
                          {account.account_holder}
                        </div>
                      </div>
                      {account.account_number && (
                        <div>
                          <div className="text-xs text-neutral-500 uppercase tracking-wide">
                            Hesap No
                          </div>
                          <div className="text-sm font-semibold text-neutral-900 mt-1">
                            {account.account_number}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                          IBAN
                        </div>
                        <div className="flex items-center gap-2 bg-neutral-50 rounded-lg px-4 py-3 border border-neutral-300">
                          <code className="text-sm font-mono font-semibold text-neutral-900 flex-1">
                            {account.iban}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(account.iban);
                            }}
                            className="text-xs font-semibold text-orange-600 hover:text-orange-700 px-3 py-1 rounded-md hover:bg-orange-50 transition-colors"
                          >
                            Kopyala
                          </button>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-dashed border-neutral-200 mt-2">
                        <div className="flex justify-between items-center text-xs text-neutral-700">
                          <span>Net Tutar</span>
                          <span className="font-semibold">
                            ₺{basePrice.toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-neutral-700 mt-1">
                          <span>
                            KDV (%{(vatRateFraction * 100).toFixed(0)})
                          </span>
                          <span className="font-semibold">
                            ₺{vatAmount.toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-neutral-900 mt-1">
                          <span className="font-semibold">
                            Toplam (KDV Dahil)
                          </span>
                          <span className="font-bold text-orange-600">
                            ₺{totalAmount.toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Uyarı */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Önemli:</span> Başvuru sahibi
                ile ödemeyi yapan kişi aynı olmalıdır. Açıklama kısmına ad-soyad
                ve telefon numaranızı yazmayı unutmayın.
              </p>
            </div>
          </div>

          {/* Ödeme Onayı */}
          <div className="border-t border-neutral-200 pt-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Ödeme Onayı
            </h2>
            <p className="text-sm text-neutral-600 mb-4">
              Ödemenizi yaptıktan sonra aşağıdaki butona tıklayarak onay
              sürecini başlatın.
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handlePaymentConfirmation}
              disabled={submitting}
              className="w-full rounded-xl bg-orange-600 px-5 py-4 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "İşleniyor..." : "Ödeme Yaptım, Onay Bekle"}
            </button>

            <p className="mt-4 text-xs text-center text-neutral-500">
              Ödemenizi yaptıktan sonra bu butona tıklayın. Ekibimiz ödemenizi
              kontrol edip hesabınızı aktif edecektir.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // PASSIVE_NO_PAYMENT - Ödeme formu
  if (status === "PASSIVE_NO_PAYMENT") {
    // Backend model: net tutar = gross_price, KDV oranı = vat_rate(%)
    const vatRateFraction =
      typeof vatRatePct === "number" ? vatRatePct / 100 : FALLBACK_VAT_RATE;
    const basePrice =
      typeof netPrice === "number" ? netPrice : FALLBACK_NET_PRICE;
    const vatAmount = basePrice * vatRateFraction;
    const totalAmount = basePrice + vatAmount;

    return (
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl border border-neutral-200">
        <div className="border-b border-neutral-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-neutral-900">
            Hizmet Bedeli Ödemesi
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Sistemimizi kullanmaya başlamak için lütfen aşağıdaki giriş bedelini
            ödeyin.
          </p>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Tutar Bilgisi */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-700">Net Tutar</span>
                <span className="text-lg font-semibold text-neutral-900">
                  ₺{basePrice.toLocaleString("tr-TR")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-700">
                  KDV (%{vatRateFraction * 100})
                </span>
                <span className="text-lg font-semibold text-neutral-900">
                  ₺{vatAmount.toLocaleString("tr-TR")}
                </span>
              </div>
              <div className="pt-3 border-t border-orange-300">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-neutral-900">
                    Toplam Ödenecek Tutar
                  </span>
                  <span className="text-2xl font-bold text-orange-600">
                    ₺{totalAmount.toLocaleString("tr-TR")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* IBAN Bilgisi */}
          <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Havale/EFT Bilgileri
            </h2>
            {loadingBankAccounts ? (
              <div className="text-center text-sm text-neutral-600 py-4">
                Banka hesap bilgileri yükleniyor...
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-center text-sm text-neutral-600 py-4">
                Banka hesap bilgisi bulunamadı.
              </div>
            ) : (
              <div className="space-y-6">
                {bankAccounts.map((account, index) => (
                  <div
                    key={account.id || index}
                    className="bg-white rounded-lg p-4 border border-neutral-200"
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wide">
                          Banka
                        </div>
                        <div className="text-sm font-semibold text-neutral-900 mt-1">
                          {account.bank_name}
                        </div>
                      </div>
                      {account.branch_name && (
                        <div>
                          <div className="text-xs text-neutral-500 uppercase tracking-wide">
                            Şube
                          </div>
                          <div className="text-sm font-semibold text-neutral-900 mt-1">
                            {account.branch_name}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wide">
                          Hesap Sahibi
                        </div>
                        <div className="text-sm font-semibold text-neutral-900 mt-1">
                          {account.account_holder}
                        </div>
                      </div>
                      {account.account_number && (
                        <div>
                          <div className="text-xs text-neutral-500 uppercase tracking-wide">
                            Hesap No
                          </div>
                          <div className="text-sm font-semibold text-neutral-900 mt-1">
                            {account.account_number}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                          IBAN
                        </div>
                        <div className="flex items-center gap-2 bg-neutral-50 rounded-lg px-4 py-3 border border-neutral-300">
                          <code className="text-sm font-mono font-semibold text-neutral-900 flex-1">
                            {account.iban}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(account.iban);
                            }}
                            className="text-xs font-semibold text-orange-600 hover:text-orange-700 px-3 py-1 rounded-md hover:bg-orange-50 transition-colors"
                          >
                            Kopyala
                          </button>
                        </div>
                      </div>
                      {/* Fiyat bilgisi backend'den toplu gelir: gross_price + vat_rate */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Uyarı */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Önemli:</span> Başvuru sahibi
                ile ödemeyi yapan kişi aynı olmalıdır. Açıklama kısmına ad-soyad
                ve telefon numaranızı yazmayı unutmayın.
              </p>
            </div>
          </div>

          {/* Ödeme Onayı */}
          <div className="border-t border-neutral-200 pt-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Ödeme Onayı
            </h2>
            <p className="text-sm text-neutral-600 mb-4">
              Ödemenizi yaptıktan sonra aşağıdaki butona tıklayarak onay
              sürecini başlatın.
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handlePaymentConfirmation}
              disabled={submitting}
              className="w-full rounded-xl bg-orange-600 px-5 py-4 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "İşleniyor..." : "Ödeme Yaptım, Onay Bekle"}
            </button>

            <p className="mt-4 text-xs text-center text-neutral-500">
              Ödemenizi yaptıktan sonra bu butona tıklayın. Ekibimiz ödemenizi
              kontrol edip hesabınızı aktif edecektir.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
