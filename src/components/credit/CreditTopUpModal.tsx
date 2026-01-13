//src/components/credit/CreditTopUpModal.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";

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

type CreditStep = 1 | 2 | 3;

const PRESET_AMOUNTS = [100, 500, 1000, 2000, 4000];

type BuyCreditRes = {
  success: boolean;
  message: any;
  warnings: any;
  otoErrorCode: any;
  otoErrorMessage: any;
  paymentID: string | null;
  paymentURL: string | null;
};

export default function CreditTopUpModal(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  // ileride gerçek endpoint gelince parent’tan set edebilirsin
  creditBalance?: number;
}) {
  const { open, onOpenChange, creditBalance = 0 } = props;
  const router = useRouter();

  const [creditStep, setCreditStep] = React.useState<CreditStep>(1);

  const [creditPreset, setCreditPreset] = React.useState<number | "other" | null>(null);
  const [creditOther, setCreditOther] = React.useState<string>("");
  const [promoCode, setPromoCode] = React.useState<string>("");

  const [payMethod, setPayMethod] = React.useState<"tap_card">("tap_card");
  const [buyingCredit, setBuyingCredit] = React.useState(false);
  const [buyCreditErr, setBuyCreditErr] = React.useState<string | null>(null);
  const [buyCreditRes, setBuyCreditRes] = React.useState<BuyCreditRes | null>(null);

  const selectedCreditAmount = React.useMemo(() => {
    if (creditPreset === "other") return Math.max(0, Math.floor(num(creditOther)));
    if (typeof creditPreset === "number") return creditPreset;
    return 0;
  }, [creditPreset, creditOther]);

  const VAT_RATE = 0.2;

  const creditSubTotal = React.useMemo(() => {
    return Math.max(0, Number.isFinite(selectedCreditAmount) ? selectedCreditAmount : 0);
  }, [selectedCreditAmount]);

  const creditVat = React.useMemo(() => {
    return Math.round(creditSubTotal * VAT_RATE * 100) / 100;
  }, [creditSubTotal]);

  const creditTotal = React.useMemo(() => {
    return Math.round((creditSubTotal + creditVat) * 100) / 100;
  }, [creditSubTotal, creditVat]);

  function toMoneyTR(x: number) {
    const fixed = (Number.isFinite(x) ? x : 0).toFixed(2);
    const [a, b] = fixed.split(".");
    const withSep = a.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `₺ ${withSep},${b}`;
  }

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  const reset = React.useCallback(() => {
    setBuyCreditErr(null);
    setBuyCreditRes(null);
    setCreditPreset(null);
    setCreditOther("");
    setPromoCode("");
    setPayMethod("tap_card");
    setCreditStep(1);
  }, []);

  // modal açılınca temiz başla
  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  async function buyCredit() {
    setBuyCreditErr(null);
    setBuyCreditRes(null);

    const bearer = getBearerToken();
    if (!bearer) {
      router.replace("/");
      return;
    }

    if (!(selectedCreditAmount > 0)) {
      setBuyCreditErr("Lütfen kredi miktarı seçin.");
      setCreditStep(1);
      return;
    }

    setBuyingCredit(true);
    try {
      const res = await fetch(`/yuksi/oto/account/buy-credit`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify({ amount: selectedCreditAmount }),
      });

      const json = await readJson<BuyCreditRes>(res);

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(pickMsg(json, `HTTP ${res.status}`));

      setBuyCreditRes(json);

      if (!json?.success) {
        setBuyCreditErr(json?.otoErrorMessage || json?.message || "Kredi satın alma başarısız.");
        return;
      }

      setCreditStep(3);
    } catch (e: any) {
      setBuyCreditErr(e?.message || "Kredi satın alma çağrısı başarısız.");
    } finally {
      setBuyingCredit(false);
    }
  }

  function openPaymentUrl() {
    const url = buyCreditRes?.paymentURL || "";
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={close} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
          {/* modal top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <div className="text-sm font-semibold text-neutral-900">Kredinizi Yükleyin</div>
            <button onClick={close} className="h-9 w-9 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600">
              ✕
            </button>
          </div>

          {/* stepper */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-center gap-3">
              <StepPill n={1} active={creditStep === 1} done={creditStep > 1} label="Kredi Miktarı" />
              <div className="h-px w-10 bg-neutral-200" />
              <StepPill n={2} active={creditStep === 2} done={creditStep > 2} label="Ödeme Yöntemi Seçiniz" />
              <div className="h-px w-10 bg-neutral-200" />
              <StepPill n={3} active={creditStep === 3} done={false} label="Tamamlandı" />
            </div>
          </div>

          {/* content */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0">
            {/* left */}
            <div className="px-6 pb-6">
              {creditStep === 1 && (
                <div className="pt-2">
                  <div className="text-sm font-semibold text-neutral-900">Kredi Miktarı</div>
                  <div className="mt-1 text-xs text-neutral-500">Tutar Seçiniz</div>

                  <div className="mt-8 flex items-center justify-center text-5xl font-semibold text-neutral-300">
                    ₺ {selectedCreditAmount > 0 ? selectedCreditAmount.toLocaleString("tr-TR") : "0"}
                  </div>
                  <div className="mt-2 text-center text-sm text-neutral-500">
                    Mevcut Kredi: <span className="font-semibold text-neutral-700">{toMoneyTR(creditBalance)}</span>
                  </div>

                  <div className="mt-10 grid grid-cols-3 gap-4">
                    {PRESET_AMOUNTS.map((a) => {
                      const active = creditPreset === a;
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setCreditPreset(a)}
                          className={cn(
                            "h-14 rounded-lg border text-sm font-semibold",
                            active ? "border-indigo-400 ring-2 ring-indigo-200" : "border-neutral-200 hover:bg-neutral-50"
                          )}
                        >
                          {a.toLocaleString("tr-TR")}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setCreditPreset("other")}
                      className={cn(
                        "h-14 rounded-lg border text-sm font-semibold",
                        creditPreset === "other" ? "border-indigo-400 ring-2 ring-indigo-200" : "border-neutral-200 hover:bg-neutral-50"
                      )}
                    >
                      Diğer
                    </button>
                  </div>

                  {creditPreset === "other" && (
                    <div className="mt-4">
                      <Label text="Diğer Tutar" />
                      <input
                        value={creditOther}
                        onChange={(e) => setCreditOther(e.target.value)}
                        placeholder="Örn: 750"
                        className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  )}

                  {buyCreditErr ? <div className="mt-4 text-sm text-rose-600">{buyCreditErr}</div> : null}

                  <div className="mt-8 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!(selectedCreditAmount > 0)) {
                          setBuyCreditErr("Lütfen kredi miktarı seçin.");
                          return;
                        }
                        setBuyCreditErr(null);
                        setCreditStep(2);
                      }}
                      className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Devam et →
                    </button>
                  </div>
                </div>
              )}

              {creditStep === 2 && (
                <div className="pt-2">
                  <div className="text-sm font-semibold text-neutral-900">Ödeme Yöntemi</div>
                  <div className="mt-1 text-xs text-neutral-500">Bir yöntem seçin</div>

                  <div className="mt-6 space-y-3">
                    <label className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input type="radio" checked={payMethod === "tap_card"} onChange={() => setPayMethod("tap_card")} />
                        <div>
                          <div className="text-sm font-semibold text-neutral-900">Kredi Kartı (Tap)</div>
                          <div className="text-xs text-neutral-500">Ödeme sayfasına yönlendirilirsiniz</div>
                        </div>
                      </div>
                      <div className="text-xs text-neutral-400">Seç</div>
                    </label>
                  </div>

                  {buyCreditErr ? <div className="mt-4 text-sm text-rose-600">{buyCreditErr}</div> : null}

                  <div className="mt-8 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCreditStep(1)}
                      className="h-10 rounded-lg border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      ← Geri
                    </button>

                    <button
                      type="button"
                      disabled={buyingCredit}
                      onClick={buyCredit}
                      className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {buyingCredit ? "İşleniyor…" : "Ödeme Oluştur"}
                    </button>
                  </div>

                  {buyCreditRes?.success && buyCreditRes?.paymentURL ? (
                    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      Ödeme oluşturuldu. Step 3’te “Ödemeye Git” ile yeni sekmede açabilirsin.
                    </div>
                  ) : null}
                </div>
              )}

              {creditStep === 3 && (
                <div className="pt-2">
                  <div className="text-sm font-semibold text-neutral-900">Tamamlandı</div>
                  <div className="mt-1 text-xs text-neutral-500">Ödeme bağlantınız hazır</div>

                  <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-sm text-neutral-600">Kredi Miktarı</div>
                    <div className="mt-1 text-xl font-semibold text-neutral-900">{toMoneyTR(selectedCreditAmount)}</div>

                    {buyCreditRes?.paymentID ? (
                      <div className="mt-3 text-xs text-neutral-500">
                        paymentID: <span className="font-mono">{buyCreditRes.paymentID}</span>
                      </div>
                    ) : null}
                  </div>

                  {buyCreditErr ? <div className="mt-4 text-sm text-rose-600">{buyCreditErr}</div> : null}

                  <div className="mt-8 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setCreditStep(1);
                        setBuyCreditErr(null);
                        setBuyCreditRes(null);
                      }}
                      className="h-10 rounded-lg border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      Yeni İşlem
                    </button>

                    <button
                      type="button"
                      disabled={!buyCreditRes?.paymentURL}
                      onClick={openPaymentUrl}
                      className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      Ödemeye Git
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* right: cart summary */}
            <div className="border-t lg:border-t-0 lg:border-l border-neutral-200 bg-white px-6 py-6">
              <div className="text-sm font-semibold text-neutral-900">Sepet Özeti</div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Ara Toplam</span>
                  <span>{toMoneyTR(creditSubTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>KDV Tutarı (%20)</span>
                  <span>{toMoneyTR(creditVat)}</span>
                </div>
                <div className="h-px bg-neutral-200" />
                <div className="flex items-center justify-between font-semibold text-neutral-900">
                  <span>Toplam</span>
                  <span>{toMoneyTR(creditTotal)}</span>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-neutral-900">Promosyon Kodu (Opsiyonel)</div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promosyon Kodu"
                    className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <button
                    type="button"
                    className="h-10 rounded-lg border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                    onClick={() => {
                      if (!promoCode.trim()) return;
                      // sadece UI
                    }}
                  >
                    Uygula
                  </button>
                </div>
                <div className="mt-2 text-xs text-neutral-400">Şimdilik promosyon sadece UI (backend endpoint yoksa).</div>
              </div>
            </div>
          </div>

          <div className="h-4 bg-white" />
        </div>
      </div>
    </div>
  );
}

/* ================= UI bits ================= */

function Label({ text }: { text: string }) {
  return <div className="mb-2 text-sm font-semibold text-neutral-800">{text}</div>;
}

function StepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold",
          done ? "bg-emerald-100 text-emerald-700" : active ? "bg-indigo-600 text-white" : "bg-neutral-100 text-neutral-400"
        )}
      >
        {done ? "✓" : n}
      </div>
      <div className={cn("text-sm font-semibold", active ? "text-neutral-900" : "text-neutral-400")}>{label}</div>
    </div>
  );
}
