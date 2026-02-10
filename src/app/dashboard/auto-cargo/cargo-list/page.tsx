//src/app/dashboard/auto-cargo/cargo-list/page.tsx
"use client";

import * as React from "react";
import CreditTopUpModal from "@/src/components/credit/CreditTopUpModal";
import CreditChip from "@/src/components/credit/CreditChip";
import { getAuthToken } from "@/src/utils/auth";
import { useRouter } from "next/navigation";
import { ModuleAccessGuard } from "@/src/components/access/ModuleAccessGuard";
import { CORPORATE_MODULES } from "@/src/hooks/useCorporateAccess";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

/* ========= Helpers ========= */
async function readJson<T = any>(res: Response): Promise<T> {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : (null as any);
  } catch {
    return t as any;
  }
}

const pickMsg = (d: any, fb: string) =>
  d?.error?.message || d?.otoErrorMessage || d?.message || d?.detail || d?.title || fb;

function normStatus(s?: string) {
  return String(s ?? "").trim();
}
function normStatusLower(s?: string) {
  return String(s ?? "").toLowerCase().trim();
}
function parseOrderDate(s?: string) {
  // "2026-01-19 14:48:35" gibi geliyor
  const x = String(s ?? "").trim();
  if (!x) return 0;
  const iso = x.includes(" ") ? x.replace(" ", "T") : x;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/* ========= Types ========= */

type RowStatusTr =
  | "Kargo Oluşturulmayı Bekleyenler"
  | "Kargoya Teslim Bekleyenler"
  | "Kuryeye Verildi / Sürücü Aranıyor"
  | "Kargoya Teslim Edilmiş/Yolda"
  | "Teslim edildi"
  | "İade edildi"
  | "İptal edildi"
  | "Askıda";

type PaymentTr = "Kapıda Ödeme" | "Ödendi" | "Ödenmedi";

type Row = {
  id: string; // orderId (OID gibi)
  orderDate: string;

  // ✅ raw status (backend)
  apiStatus: string;

  // ✅ mapped label (UI)
  statusTr: RowStatusTr;

  senderAddress: string;
  customerName: string;

  brandName?: string;
  receiverAddress?: string;
  destinationCity?: string;

  invoiceAmount: string;
  paymentType: PaymentTr;

  shipmentNumber?: string;
  trackingNumber?: string;
};

type ApiOrder = {
  id?: string;
  orderId?: string;
  status?: string;

  orderDate?: string;
  originCity?: string;

  customerName?: string;
  customerAddress?: string;
  destinationCity?: string;

  amount?: number;
  grandTotal?: number;
  currency?: string;

  paymentMethod?: string; // "paid" | "cod" ...
  shipmentNumber?: string;
  trackingURL?: string;
  skus?: string;
  totalDue?: number;
  quantities?: string;
  subTotal?: number;

  customerPhone?: string;
  customerEmail?: string;

  reverseShipment?: string; // "false"/"true" gibi geliyor
  isReturnShipment?: string; // "no"/"yes" gibi geliyor
  weight?: number;

  destinationCountry?: string;
  originCountry?: string;

  district?: string;
  deliverySlot?: string;

  modifiedBy?: string;
  modifiedDate?: string;
  packageCount?: number;
  addressConfirm?: string;

  customer?: {
    country?: string;
    address?: string;
    city?: string;
    district?: string;
    name?: string;
    mobile?: string;
    postcode?: string;
    email?: string;
    lat?: number;
    lon?: number;
    id?: number;
    refID?: any;
  };
};

type OrdersListResponse = {
  success: boolean;
  message: string | null;
  warnings: any;
  otoErrorCode: any;
  otoErrorMessage: string | null;
  perPage: number;
  totalPage: number;
  currentPage: number;
  totalCount: number;
  orders: ApiOrder[];
};
type DeliveryCompanyOption = {
  serviceType?: string | null;
  deliveryOptionName?: string | null;
  deliveryOptionId?: number | null;
  price?: number | null;
  currency?: string | null;
  logo?: string | null;
  maxDeliveryDay?: number | null;
};

type GetDeliveryFeeResponse = {
  success: boolean;
  message: string | null;
  otoErrorCode: any;
  otoErrorMessage: string | null;
  deliveryCompany?: DeliveryCompanyOption[];
};

type CreateShipmentResponse = {
  success?: boolean;
  message?: string | null;
  otoErrorMessage?: string | null;
  // swagger bazen "string" diyordu; o yüzden any toleranslıyız.
  [k: string]: any;
};

type PrintAwbResponse = {
  success: boolean;
  message: string | null;
  otoErrorMessage: string | null;
  printAWBURL?: string | null;
};

type OrderDetailsResponse = {
  success: boolean;
  message: string | null;
  warnings: any;
  otoErrorCode: any;
  otoErrorMessage: string | null;

  orderId: string;
  status: string;
  trackingURL: string | null;

  statusHistory: Array<{
    date: string;
    description: string;
    id: number;
    status: string;
  }>;

  items: Array<{
    quantity: number;
    rowTotal?: number | null;
    price?: number | null;
    id?: number | null;
    taxAmount?: number | null;
    sku: string;
  }>;
};

/* ========= Status mapping (senin dump’a göre) =========
  new                -> Kargo Oluşturulmayı Bekleyenler
  assignedToWarehouse-> Kargoya Teslim Bekleyenler
  searchingDriver    -> Kuryeye Verildi / Sürücü Aranıyor

  Diğer olasılar:
  delivered          -> Teslim edildi
  returned           -> İade edildi
  canceled/cancelled -> İptal edildi
  unknown            -> Askıda
*/
function apiStatusToTr(s?: string): RowStatusTr {
  const x = normStatusLower(s);

  if (!x) return "Askıda";

  if (x === "new") return "Kargo Oluşturulmayı Bekleyenler";

  if (x === "assignedtowarehouse") return "Kargoya Teslim Bekleyenler";

  if (x === "searchingdriver") return "Kuryeye Verildi / Sürücü Aranıyor";
  if (x.includes("shipmentcanceled") || x.includes("shipment_cancel")) return "İptal edildi";

  if (x.includes("in_transit") || x.includes("onway") || x.includes("on_way") || x.includes("shipped"))
    return "Kargoya Teslim Edilmiş/Yolda";

  if (x.includes("delivered")) return "Teslim edildi";
  if (x.includes("returned")) return "İade edildi";
  if (x.includes("cancel") || x.includes("canceled") || x.includes("cancelled")) return "İptal edildi";

  if (x.includes("pending") || x.includes("hold") || x.includes("suspend")) return "Askıda";

  return "Askıda";
}

function paymentToTr(p?: string): PaymentTr {
  const x = String(p ?? "").toLowerCase();
  if (x === "paid") return "Ödendi";
  if (x === "cod" || x.includes("cash") || x.includes("door")) return "Kapıda Ödeme";
  if (x) return "Ödenmedi";
  return "Ödenmedi";
}

function formatMoney(amount?: number, currency?: string) {
  const n = Number(amount ?? 0);
  const cur = currency || "TRY";

  const fixed = n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (cur === "TRY") return `₺ ${fixed}`;
  if (cur === "SAR") return `SAR ${fixed}`;
  return `${cur} ${fixed}`;
}

function statusBadgeClass(tr: RowStatusTr) {
  switch (tr) {
    case "Kargo Oluşturulmayı Bekleyenler":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "Kargoya Teslim Bekleyenler":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "Kuryeye Verildi / Sürücü Aranıyor":
      return "border-indigo-200 bg-indigo-50 text-indigo-800";
    case "Kargoya Teslim Edilmiş/Yolda":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "Teslim edildi":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "İade edildi":
      return "border-orange-200 bg-orange-50 text-orange-800";
    case "İptal edildi":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "Askıda":
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

function toRow(o: ApiOrder): Row {
  const id = o.orderId || o.id || "-";
  const apiStatus = normStatus(o.status);
  const statusTr = apiStatusToTr(apiStatus);

  return {
    id,
    orderDate: o.orderDate || "-",
    apiStatus: apiStatus || "-", // ✅ tablo/filtre için raw
    statusTr,
    senderAddress: o.originCity || "-",
    brandName: "", // backend yoksa boş
    customerName: o.customerName || "-",
    receiverAddress: o.customerAddress || "-",
    destinationCity: o.destinationCity || "-",
    invoiceAmount: formatMoney(o.grandTotal ?? o.amount ?? 0, o.currency),
    paymentType: paymentToTr(o.paymentMethod),
    shipmentNumber: o.shipmentNumber || "",
    trackingNumber: o.trackingURL || "",
  };
}

function OrderDetailsModal({
  open,
  orderId,
  token,
  onClose,
}: {
  open: boolean;
  orderId: string | null;
  token: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [data, setData] = React.useState<OrderDetailsResponse | null>(null);
  const [summary, setSummary] = React.useState<ApiOrder | null>(null);

  React.useEffect(() => {
    if (!open || !orderId) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      setData(null);
      setSummary(null);

      try {
        const res = await fetch(`/yuksi/oto/orders/${encodeURIComponent(orderId)}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const j = await readJson<OrderDetailsResponse>(res);
        if (!res.ok || !j?.success) throw new Error(pickMsg(j, `Sipariş detayı alınamadı (HTTP ${res.status})`));

        if (!alive) return;
        setData(j);
        try {
          const resL = await fetch("/yuksi/oto/orders/list", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ page: 1, perPage: 1, orderId }), // orderId filtre destekliyorsa süper
          });

          const jl = await readJson<OrdersListResponse>(resL);
          if (resL.ok && jl?.success && Array.isArray(jl.orders) && jl.orders.length > 0) {
            setSummary(jl.orders[0]);
          } else {
            setSummary(null);
          }
        } catch {
          setSummary(null);
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e || "Bilinmeyen hata"));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, orderId, token]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 sm:px-5 py-3 sm:py-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-semibold text-neutral-900">Sipariş Detayı</div>
            <div className="mt-1 text-xs text-neutral-500 truncate">Order ID: {orderId}</div>
          </div>
          <button
            type="button"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-neutral-100 text-neutral-600 text-lg sm:text-xl shrink-0"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(95vh-120px)] sm:max-h-[75vh] overflow-auto px-3 sm:px-5 py-3 sm:py-4">
          {loading ? (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
              Yükleniyor…
            </div>
          ) : err ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>
          ) : data ? (
            <div className="space-y-5">
              {/* Top info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
                  <div className="text-xs font-semibold text-neutral-600">Durum (raw)</div>
                  <div className="mt-2 text-xs sm:text-sm font-semibold text-neutral-900 break-words">{data.status}</div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
                  <div className="text-xs font-semibold text-neutral-600">Tracking URL</div>
                  <div className="mt-2 text-xs sm:text-sm text-neutral-900 break-all">
                    {data.trackingURL ? (
                      <a className="text-indigo-700 underline" href={data.trackingURL} target="_blank" rel="noreferrer">
                        {data.trackingURL}
                      </a>
                    ) : (
                      <span className="text-neutral-500">Yok</span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
                  <div className="text-xs font-semibold text-neutral-600">Kalem sayısı</div>
                  <div className="mt-2 text-xs sm:text-sm font-semibold text-neutral-900">{data.items?.length ?? 0}</div>
                </div>
              </div>
              {/* List response özeti (Türkçeleştirilmiş) */}
              {summary ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <div className="text-sm font-semibold text-neutral-900">Sipariş Özeti</div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-600">SKU</div>
                      <div className="mt-1 text-sm text-neutral-900 break-words">{summary.skus || "-"}</div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-600">Paket Sayısı</div>
                      <div className="mt-1 text-sm font-semibold text-neutral-900">{summary.packageCount ?? "-"}</div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-600">Ağırlık (kg)</div>
                      <div className="mt-1 text-sm font-semibold text-neutral-900">{summary.weight ?? "-"}</div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-600">Müşteri Telefon</div>
                      <div className="mt-1 text-sm text-neutral-900">{summary.customerPhone || summary.customer?.mobile || "-"}</div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-600">Müşteri E-posta</div>
                      <div className="mt-1 text-sm text-neutral-900 break-all">{summary.customerEmail || summary.customer?.email || "-"}</div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-600">İlçe</div>
                      <div className="mt-1 text-sm text-neutral-900">{summary.district || summary.customer?.district || "-"}</div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:col-span-2">
                      <div className="text-xs font-semibold text-neutral-600">Adres</div>
                      <div className="mt-1 text-sm text-neutral-900 break-words">
                        {summary.customerAddress || summary.customer?.address || "-"}
                      </div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-600">Teslimat Slotu</div>
                      <div className="mt-1 text-sm text-neutral-900">{summary.deliverySlot || "-"}</div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-600">Son Güncelleme</div>
                      <div className="mt-1 text-sm text-neutral-900">{summary.modifiedDate || "-"}</div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-600">Güncelleyen</div>
                      <div className="mt-1 text-sm text-neutral-900">{summary.modifiedBy || "-"}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Items */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-neutral-900">Ürünler</div>
                <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-2 bg-neutral-50 px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-semibold text-neutral-600">
                      <div>SKU</div>
                      <div>Qty</div>
                      <div>Price</div>
                      <div>Tax</div>
                      <div>Row Total</div>
                    </div>

                    <div className="divide-y divide-neutral-100">
                      {(data.items ?? []).map((it, idx) => (
                        <div
                          key={`${it.sku}-${idx}`}
                          className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm"
                        >
                          <div className="min-w-0 truncate font-semibold text-neutral-800">{it.sku}</div>
                          <div className="text-neutral-700">{it.quantity ?? "-"}</div>
                          <div className="text-neutral-700">{it.price ?? "-"}</div>
                          <div className="text-neutral-700">{it.taxAmount ?? "-"}</div>
                          <div className="text-neutral-700">{it.rowTotal ?? "-"}</div>
                        </div>
                      ))}

                      {(!data.items || data.items.length === 0) && (
                        <div className="px-4 py-8 text-center text-xs sm:text-sm text-neutral-500">Ürün yok.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status history */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-neutral-900">Durum Geçmişi</div>
                <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200">
                  <div className="min-w-[500px]">
                    <div className="grid grid-cols-[1fr_0.9fr_2fr] gap-2 bg-neutral-50 px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-semibold text-neutral-600">
                      <div>Tarih</div>
                      <div>Status</div>
                      <div>Açıklama</div>
                    </div>

                    <div className="divide-y divide-neutral-100">
                      {(data.statusHistory ?? []).map((h) => (
                        <div key={h.id} className="grid grid-cols-[1fr_0.9fr_2fr] gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                          <div className="text-neutral-700 break-words">{h.date}</div>
                          <div className="font-semibold text-neutral-800 break-words">{h.status}</div>
                          <div className="text-neutral-700 break-words">{h.description}</div>
                        </div>
                      ))}

                      {(!data.statusHistory || data.statusHistory.length === 0) && (
                        <div className="px-4 py-8 text-center text-xs sm:text-sm text-neutral-500">Kayıt yok.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">Veri yok.</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={onClose}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function ShipOrderModal({
  open,
  orderId,
  token,
  onClose,
  onAfterClose,
}: {
  open: boolean;
  orderId: string | null;
  token: string | null;
  onClose: () => void;
  onAfterClose?: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [options, setOptions] = React.useState<DeliveryCompanyOption[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [created, setCreated] = React.useState(false);
  const [printLoading, setPrintLoading] = React.useState(false);
  const [postCreateDelay, setPostCreateDelay] = React.useState(false);
  const delayTimerRef = React.useRef<number | null>(null);
  function closeAndRefresh() {
    onClose();
    onAfterClose?.();
  }

  React.useEffect(() => {
    return () => {
      if (delayTimerRef.current) window.clearTimeout(delayTimerRef.current);
    };
  }, []);

  // 1) Modal açılınca delivery seçeneklerini çek
  React.useEffect(() => {
    if (!open || !orderId) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      setOptions([]);
      setSelectedId(null);
      setCreated(false);
      setPostCreateDelay(false);
      if (delayTimerRef.current) window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;

      try {
        const res = await fetch("/yuksi/oto/logistics/get-delivery-fee", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ orderId }), // ✅ swagger screenshot 1
        });

        const j = await readJson<GetDeliveryFeeResponse>(res);
        if (!res.ok || !j?.success) throw new Error(pickMsg(j, `Kargo seçenekleri alınamadı (HTTP ${res.status})`));

        const arr = Array.isArray(j.deliveryCompany) ? j.deliveryCompany : [];
        if (!alive) return;
        setOptions(arr);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e || "Bilinmeyen hata"));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, orderId, token]);

  async function createShipment() {
    if (!orderId) return;
    if (!selectedId) {
      setErr("Lütfen bir kargo firması seç.");
      return;
    }

    setCreating(true);
    setErr("");

    try {
      const res = await fetch("/yuksi/oto/shipments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          order_id: orderId,
          delivery_option_id: selectedId,
        }),
      });

      const j = await readJson<CreateShipmentResponse>(res);
      if (!res.ok) throw new Error(pickMsg(j, `Kargo oluşturma başarısız (HTTP ${res.status})`));

      // ✅ create success -> artık etiketi yazdır butonu çıkacak
      setPostCreateDelay(true);
      setCreated(false);

      if (delayTimerRef.current) window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = window.setTimeout(() => {
        setPostCreateDelay(false);
        setCreated(true);
      }, 5000);
    } catch (e: any) {
      setErr(String(e?.message || e || "Bilinmeyen hata"));
      setCreated(false);
      setPostCreateDelay(false);
      if (delayTimerRef.current) window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    } finally {
      setCreating(false);
    }
  }

  async function printAwb() {
    if (!orderId) return;

    setPrintLoading(true);
    setErr("");

    try {
      const res2 = await fetch(`/yuksi/oto/shipments/awb/${encodeURIComponent(orderId)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const j2 = await readJson<PrintAwbResponse>(res2);
      if (!res2.ok || !j2?.success) throw new Error(pickMsg(j2, `Etiket alınamadı (HTTP ${res2.status})`));

      const url = String(j2.printAWBURL || "").trim();
      if (!url) throw new Error("printAWBURL boş geldi.");

      window.open(url, "_blank", "noopener,noreferrer");
      closeAndRefresh();
    } catch (e: any) {
      setErr(String(e?.message || e || "Bilinmeyen hata"));
    } finally {
      setPrintLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4" onMouseDown={closeAndRefresh}>
      <div className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-lg" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 sm:px-5 py-3 sm:py-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-semibold text-neutral-900">Siparişi Kargola</div>
            <div className="mt-1 text-xs text-neutral-500 truncate">Order ID: {orderId}</div>
          </div>
          <button type="button" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-neutral-100 text-neutral-600 text-lg sm:text-xl shrink-0" onClick={closeAndRefresh} aria-label="Kapat">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(95vh-180px)] sm:max-h-[75vh] overflow-auto px-3 sm:px-5 py-3 sm:py-4">
          {err ? <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div> : null}

          {loading ? (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">Yükleniyor…</div>
          ) : options.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-600">Bu sipariş için kargo seçeneği yok.</div>
          ) : (
            <div className="space-y-2">
              {options.map((o, idx) => {
                const id = Number(o.deliveryOptionId || 0) || 0;
                const active = selectedId === id;
                return (
                  <button
                    key={`${id}-${idx}`}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={[
                      "w-full rounded-lg border px-4 py-3 text-left hover:bg-neutral-50",
                      active ? "border-indigo-600 bg-indigo-50" : "border-neutral-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      {o.logo ? (
                        <img
                          src={o.logo}
                          alt={o.deliveryOptionName || "logo"}
                          className="h-9 w-9 rounded-md border border-neutral-200 object-cover bg-white"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-md border border-neutral-200 bg-neutral-100 flex items-center justify-center text-xs text-neutral-500">
                          🚚
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-neutral-900 truncate">
                          {o.deliveryOptionName || "Kargo"}
                        </div>
                        <div className="mt-0.5 text-xs text-neutral-600">
                          OptionId: <span className="font-semibold">{String(o.deliveryOptionId ?? "-")}</span>
                          {typeof o.price === "number" ? (
                            <>
                              {" "}
                              • Ücret: <span className="font-semibold">{o.price}</span> {o.currency || ""}
                            </>
                          ) : null}
                          {typeof o.maxDeliveryDay === "number" ? <> • Maks gün: {o.maxDeliveryDay}</> : null}
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-neutral-700">{active ? "Seçildi" : "Seç"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-neutral-200 bg-neutral-50 px-3 sm:px-5 py-3 sm:py-4">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={closeAndRefresh}
            disabled={creating}
          >
            Vazgeç
          </button>

          {!created ? (
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              onClick={createShipment}
              disabled={creating || loading || options.length === 0 || !selectedId || postCreateDelay}
              title="Kargo oluştur"
            >
              {creating ? "Oluşturuluyor…" : postCreateDelay ? "Etiket yazdırılıyor…" : "Kargoyu Yola Çıkar"}
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              onClick={printAwb}
              disabled={printLoading}
              title="Etiketi yazdır (AWB)"
            >
              {printLoading ? "Etiket alınıyor…" : "Etiketi Yazdır"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


export default function CargoListPage() {
  const token = React.useMemo(getAuthToken, []);

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsOrderId, setDetailsOrderId] = React.useState<string | null>(null);
  const [canceling, setCanceling] = React.useState<Record<string, boolean>>({});
  const [shipOpen, setShipOpen] = React.useState(false);
  const [shipOrderId, setShipOrderId] = React.useState<string | null>(null);

  function openShip(orderId: string) {
    setShipOrderId(orderId);
    setShipOpen(true);
  }

  function openDetails(orderId: string) {
    setDetailsOrderId(orderId);
    setDetailsOpen(true);
  }
  async function cancelShipment(orderId: string, shipmentId?: string) {
    if (!shipmentId) {
      alert("Bu sipariş için kargo oluşturulmadı, iptal edemiyorum.");
      return;
    }

    const ok = confirm(`Kargoyu iptal etmek istediğine emin misin?\nOrder: ${orderId}\nShipment: ${shipmentId}`);
    if (!ok) return;

    setCanceling((s) => ({ ...s, [orderId]: true }));
    try {
      const res = await fetch("/yuksi/oto/shipments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          order_id: orderId,
          shipment_id: shipmentId,
        }),
      });

      const j = await readJson<any>(res);

      if (!res.ok) {
        throw new Error(pickMsg(j, `İptal başarısız (HTTP ${res.status})`));
      }

      // 200 response bazen "string" dönebiliyor (swagger)
      // başarılı sayıp listeyi yenileyelim
      await fetchOrders();
      refreshCreditRef.current?.();
    } catch (e: any) {
      alert(String(e?.message || e || "İptal sırasında hata"));
    } finally {
      setCanceling((s) => ({ ...s, [orderId]: false }));
    }
  }

  // toolbar
  const [bulkMenu] = React.useState("Kargo Oluştur");

  // filters
  const [filters, setFilters] = React.useState({
    orderNo: "",
    orderDate: "",
    apiStatus: "", // ✅ backend status filtresi (new, assignedToWarehouse, searchingDriver, ...)
    senderAddress: "",
    brandName: "",
    customerName: "",
    receiverAddress: "",
    destinationCity: "",
    invoiceMin: "",
    invoiceMax: "",
    paymentType: "",
  });

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const [pageSize, setPageSize] = React.useState(10);
  const [page, setPage] = React.useState(1);

  // API state
  const [rows, setRows] = React.useState<Row[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [apiTotalPages, setApiTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string>("");

  // Credit
  const [creditBalance] = React.useState<number>(0);
  const [creditOpen, setCreditOpen] = React.useState(false);

  // ✅ Table layout
  const GRID =
    "grid-cols-[4px_minmax(160px,1.2fr)_minmax(160px,1fr)_minmax(220px,1.2fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(160px,0.9fr)]";
  const MINW = "min-w-0";

  // Fetch orders
  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      // ✅ Backend filtreyi burada da kullan: status
      const res = await fetch("/yuksi/oto/orders/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          page,
          perPage: pageSize,
          status: filters.apiStatus || "", // ✅ selected raw status
        }),
      });

      const data = await readJson<OrdersListResponse>(res);

      if (!res.ok || !data?.success) {
        throw new Error(pickMsg(data, `Siparişler alınamadı (HTTP ${res.status})`));
      }

      const mapped = Array.isArray(data.orders) ? data.orders.map(toRow) : [];
      mapped.sort((a, b) => parseOrderDate(b.orderDate) - parseOrderDate(a.orderDate));
      setRows(mapped);
      setApiTotal(Number(data.totalCount ?? mapped.length) || 0);
      setApiTotalPages(Math.max(1, Number(data.totalPage ?? 1) || 1));

      const cp = Number(data.currentPage ?? page);
      if (Number.isFinite(cp) && cp !== page) setPage(cp);
    } catch (e: any) {
      setRows([]);
      setApiTotal(0);
      setApiTotalPages(1);
      setErr(String(e?.message || e || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, token, filters.apiStatus]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset page when pageSize/filters change (client-side olanlar)
  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pageSize,
    filters.orderNo,
    filters.customerName,
    filters.senderAddress,
    filters.brandName,
    filters.receiverAddress,
    filters.destinationCity,
    filters.orderDate,
    filters.invoiceMin,
    filters.invoiceMax,
    filters.paymentType,
    filters.apiStatus,
  ]);

  // Client-side filter (fetched page items)
  const filteredRows = React.useMemo(() => {
    let r = [...rows];

    if (filters.orderNo.trim()) r = r.filter((x) => x.id.toLowerCase().includes(filters.orderNo.trim().toLowerCase()));
    if (filters.customerName.trim())
      r = r.filter((x) => x.customerName.toLowerCase().includes(filters.customerName.trim().toLowerCase()));
    if (filters.senderAddress.trim())
      r = r.filter((x) => (x.senderAddress ?? "").toLowerCase().includes(filters.senderAddress.trim().toLowerCase()));
    if (filters.brandName.trim())
      r = r.filter((x) => (x.brandName ?? "").toLowerCase().includes(filters.brandName.trim().toLowerCase()));
    if (filters.receiverAddress.trim())
      r = r.filter((x) => (x.receiverAddress ?? "").toLowerCase().includes(filters.receiverAddress.trim().toLowerCase()));
    if (filters.destinationCity.trim())
      r = r.filter((x) => (x.destinationCity ?? "").toLowerCase().includes(filters.destinationCity.trim().toLowerCase()));

    // ✅ status zaten backend’den filtreleniyor, ama yine de UI tarafında güvenlik:
    if (filters.apiStatus) r = r.filter((x) => normStatusLower(x.apiStatus) === normStatusLower(filters.apiStatus));

    if (filters.paymentType) r = r.filter((x) => x.paymentType === (filters.paymentType as any));

    return r;
  }, [rows, filters]);

  const allChecked = React.useMemo(() => {
    const ids = filteredRows.map((r) => r.id);
    return ids.length > 0 && ids.every((id) => selected[id]);
  }, [filteredRows, selected]);

  function toggleAll() {
    const next: Record<string, boolean> = { ...selected };
    if (allChecked) {
      for (const r of filteredRows) next[r.id] = false;
    } else {
      for (const r of filteredRows) next[r.id] = true;
    }
    setSelected(next);
  }

  function toggleOne(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function resetFilters() {
    setFilters({
      orderNo: "",
      orderDate: "",
      apiStatus: "",
      senderAddress: "",
      brandName: "",
      customerName: "",
      receiverAddress: "",
      destinationCity: "",
      invoiceMin: "",
      invoiceMax: "",
      paymentType: "",
    });
  }

  // ✅ status select options: dump’taki gerçek değerler + olasılar
  const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "", label: "Tümü" },
    { value: "new", label: "new (Kargo oluşturulmayı bekleyen)" },
    { value: "assignedToWarehouse", label: "assignedToWarehouse (Kargoya teslim bekleyen)" },
    { value: "searchingDriver", label: "searchingDriver (Sürücü aranıyor)" },
    { value: "in_transit", label: "in_transit (Yolda)" },
    { value: "delivered", label: "delivered (Teslim edildi)" },
    { value: "returned", label: "returned (İade)" },
    { value: "canceled", label: "canceled (İptal)" },
  ];

  const router = useRouter();
  const pageSafe = Math.min(page, apiTotalPages);
  const refreshCreditRef = React.useRef<null | (() => void)>(null);

  return (
    <ModuleAccessGuard moduleId={CORPORATE_MODULES.YUKSI_KARGO}>
    <div className="w-full max-w-full overflow-x-hidden px-2 py-4 sm:px-4 sm:py-5 lg:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-lg sm:text-base">📦</div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 truncate">Kargo</h1>
        </div>

        {/* right top area */}
        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-start justify-end gap-2 sm:gap-3">
          <button
            type="button"
            className="order-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap"
            onClick={() => router.push("/dashboard/auto-cargo/create-cargo")}
          >
            + Sipariş Ekle
          </button>

          <div className="order-2 shrink-0 self-start">
            <CreditChip
              onRegisterRefresh={(refresh) => {
                refreshCreditRef.current = refresh;
              }}
              onTopUp={({ refreshCredit } = {}) => {
                refreshCreditRef.current = refreshCredit || refreshCreditRef.current;
                setCreditOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* Toolbar row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700"
              onClick={() => router.push("/dashboard/auto-cargo/create-cargo")}
            >
              <span className="hidden sm:inline">📦</span>
              <span className="sm:hidden">📦</span>
              <span className="hidden sm:inline">{bulkMenu}</span>
              <span className="sm:hidden">Kargo</span>
              <span className="opacity-90 hidden sm:inline">▾</span>
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={resetFilters}
            title="Filtreleri sıfırla"
          >
            ↺
          </button>
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={() => fetchOrders()}
            title="Yenile"
          >
            ⟳
          </button>
        </div>
      </div>

      {/* Info strip */}
      <div className="mt-3 w-full">
        {loading ? (
          <div className="rounded-lg border border-neutral-200 bg-white px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-neutral-600">Yükleniyor…</div>
        ) : err ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-rose-700 break-words">{err}</div>
        ) : null}
      </div>

      {/* Table */}
      <div className="mt-3 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <div className={cn(MINW, "border-b border-neutral-200 bg-neutral-50 px-3 py-3")}>
            {/* Header row */}
            <div className={cn("grid items-center gap-3 text-xs font-semibold text-neutral-600", GRID)}>
              <div className="flex items-center justify-center">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} onClick={(e) => e.stopPropagation()} />
              </div>

              <div className="min-w-0 truncate whitespace-nowrap">Sipariş Numarası</div>
              <div className="min-w-0 truncate whitespace-nowrap">Sipariş Tarihi</div>
              <div className="min-w-0 truncate whitespace-nowrap">Durum</div>
              <div className="min-w-0 truncate whitespace-nowrap">Sipariş Tutarı</div>
              <div className="min-w-0 truncate whitespace-nowrap">Ödeme Türü</div>
              <div className="min-w-0 truncate whitespace-nowrap text-right">İşlem</div>
            </div>

            {/* Filter row */}
            <div className={cn("mt-3 grid items-center gap-3", GRID)}>
              <div />

              <input
                value={filters.orderNo}
                onChange={(e) => setFilters((f) => ({ ...f, orderNo: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder="Sipariş no"
              />

              <input
                value={filters.orderDate}
                onChange={(e) => setFilters((f) => ({ ...f, orderDate: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder="Tarih"
              />

              <select
                value={filters.apiStatus}
                onChange={(e) => setFilters((f) => ({ ...f, apiStatus: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <div />

              <select
                value={filters.paymentType}
                onChange={(e) => setFilters((f) => ({ ...f, paymentType: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
              >
                <option value="">Seç</option>
                <option value="Kapıda Ödeme">Kapıda Ödeme</option>
                <option value="Ödendi">Ödendi</option>
                <option value="Ödenmedi">Ödenmedi</option>
              </select>

              <div />
            </div>
          </div>

          {/* Body */}
          <div className={cn(MINW, "divide-y divide-neutral-100")}>
            {filteredRows.map((r) => (
              <div
                key={r.id}
                className="px-3 py-3 cursor-pointer hover:bg-neutral-50"
                onClick={() => openDetails(r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openDetails(r.id);
                }}
              >
                <div className={cn("grid items-center gap-3 text-sm", GRID)}>
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={!!selected[r.id]}
                      onChange={() => toggleOne(r.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="min-w-0 truncate font-semibold text-indigo-700">{r.id}</div>

                  <div className="min-w-0 truncate text-neutral-700">{r.orderDate}</div>

                  <div className="min-w-0 truncate">
                    <span
                      title={`raw: ${r.apiStatus}`}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                        statusBadgeClass(r.statusTr)
                      )}
                    >
                      {r.statusTr}
                    </span>
                  </div>

                  <div className="min-w-0 truncate text-neutral-700">{r.invoiceAmount}</div>

                  <div className="min-w-0 truncate text-neutral-700">{r.paymentType}</div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className={cn(
                        "rounded-lg border px-5  text-sm font-semibold",
                        "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        openShip(r.id);
                      }}
                      title="Siparişi kargola (firma seç → oluştur → etiket aç)"
                    >
                      Siparişi Kargola
                    </button>

                    <button
                      type="button"
                      className={cn(
                        "rounded-lg border px-5 text-sm font-semibold",
                        "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
                        canceling[r.id] ? "opacity-60 pointer-events-none" : ""
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelShipment(r.id, r.shipmentNumber);
                      }}
                      title="Kargoyu iptal et"
                    >
                      {canceling[r.id] ? "İptal ediliyor…" : "Kargoyu İptal Et"}
                    </button>
                  </div>
                  
                </div>

              </div>
            ))}

            {!loading && filteredRows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-neutral-500">Sonuç bulunamadı.</div>
            ) : null}
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden w-full overflow-x-hidden">
          {/* Filters */}
          <div className="border-b border-neutral-200 bg-neutral-50 p-2 sm:p-3 space-y-2">
            <input
              value={filters.orderNo}
              onChange={(e) => setFilters((f) => ({ ...f, orderNo: e.target.value }))}
              className="h-9 w-full rounded-lg border border-neutral-200 px-2 sm:px-3 text-xs sm:text-sm"
              placeholder="Sipariş no"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={filters.orderDate}
                onChange={(e) => setFilters((f) => ({ ...f, orderDate: e.target.value }))}
                className="h-9 w-full rounded-lg border border-neutral-200 px-2 sm:px-3 text-xs sm:text-sm"
                placeholder="Tarih"
              />
              <select
                value={filters.paymentType}
                onChange={(e) => setFilters((f) => ({ ...f, paymentType: e.target.value }))}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm"
              >
                <option value="">Ödeme Türü</option>
                <option value="Kapıda Ödeme">Kapıda Ödeme</option>
                <option value="Ödendi">Ödendi</option>
                <option value="Ödenmedi">Ödenmedi</option>
              </select>
            </div>
            <select
              value={filters.apiStatus}
              onChange={(e) => setFilters((f) => ({ ...f, apiStatus: e.target.value }))}
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cards */}
          <div className="divide-y divide-neutral-100 w-full">
            {filteredRows.map((r) => (
              <div
                key={r.id}
                className="p-2 sm:p-4 cursor-pointer hover:bg-neutral-50 w-full overflow-hidden"
                onClick={() => openDetails(r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openDetails(r.id);
                }}
              >
                <div className="flex items-start gap-2 sm:gap-3 w-full">
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    onChange={() => toggleOne(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-2 w-full overflow-hidden">
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="text-xs sm:text-sm font-semibold text-indigo-700 truncate">{r.id}</div>
                        <div className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 truncate">{r.orderDate}</div>
                      </div>
                      <span
                        title={`raw: ${r.apiStatus}`}
                        className={cn(
                          "inline-flex items-center rounded-full border px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold shrink-0 max-w-[70px] sm:max-w-none",
                          statusBadgeClass(r.statusTr)
                        )}
                      >
                        <span className="truncate">{r.statusTr}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs w-full">
                      <div className="min-w-0 overflow-hidden">
                        <span className="text-neutral-500">Tutar: </span>
                        <span className="font-semibold text-neutral-900 truncate block">{r.invoiceAmount}</span>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <span className="text-neutral-500">Ödeme: </span>
                        <span className="font-semibold text-neutral-900 truncate block">{r.paymentType}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 w-full">
                      <button
                        type="button"
                        className={cn(
                          "h-8 sm:h-9 w-full rounded-lg border text-[10px] sm:text-xs font-semibold whitespace-nowrap",
                          "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          openShip(r.id);
                        }}
                      >
                        Siparişi Kargola
                      </button>

                      <button
                        type="button"
                        className={cn(
                          "h-8 sm:h-9 w-full rounded-lg border text-[10px] sm:text-xs font-semibold whitespace-nowrap",
                          "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
                          canceling[r.id] ? "opacity-60 pointer-events-none" : ""
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelShipment(r.id, r.shipmentNumber);
                        }}
                      >
                        {canceling[r.id] ? "İptal ediliyor…" : "Kargoyu İptal Et"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!loading && filteredRows.length === 0 ? (
              <div className="px-2 sm:px-4 py-12 text-center text-xs sm:text-sm text-neutral-500">Sonuç bulunamadı.</div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 md:gap-4 border-t border-neutral-200 bg-white px-2 sm:px-3 md:px-4 py-2 sm:py-3 w-full overflow-x-hidden">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 shrink-0">
            <span>Toplam: </span>
            <span className="font-semibold text-neutral-800">{apiTotal}</span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 sm:h-9 rounded-lg border border-neutral-200 bg-white px-2 sm:px-3 text-xs sm:text-sm"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="text-xs sm:text-sm text-neutral-600 hidden sm:block">/ {apiTotal}</div>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-2 shrink-0 overflow-x-auto">
            <button
              type="button"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-sm shrink-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1 || loading}
              title="Önceki"
            >
              ‹
            </button>

            <div className="inline-flex items-center gap-1 sm:gap-2 shrink-0">
              {Array.from({ length: Math.min(3, apiTotalPages) }).map((_, idx) => {
                const p = idx + 1;
                const active = p === pageSafe;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    disabled={loading}
                    className={cn(
                      "h-8 w-8 sm:h-9 sm:w-9 rounded-lg border text-xs sm:text-sm font-semibold shrink-0",
                      active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    {p}
                  </button>
                );
              })}

              {apiTotalPages > 3 ? (
                <>
                  <span className="px-0.5 sm:px-1 text-xs sm:text-sm text-neutral-500 shrink-0">…</span>
                  <button
                    type="button"
                    onClick={() => setPage(apiTotalPages)}
                    disabled={loading}
                    className={cn(
                      "h-8 w-8 sm:h-9 sm:w-9 rounded-lg border text-xs sm:text-sm font-semibold shrink-0",
                      pageSafe === apiTotalPages ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    {apiTotalPages}
                  </button>
                </>
              ) : null}
            </div>

            <button
              type="button"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-sm shrink-0"
              onClick={() => setPage((p) => Math.min(apiTotalPages, p + 1))}
              disabled={pageSafe >= apiTotalPages || loading}
              title="Sonraki"
            >
              ›
            </button>
          </div>
        </div>
      </div>
      <OrderDetailsModal
        open={detailsOpen}
        orderId={detailsOrderId}
        token={token}
        onClose={() => {
          setDetailsOpen(false);
          setDetailsOrderId(null);
        }}
      />
      <CreditTopUpModal open={creditOpen} onOpenChange={setCreditOpen} creditBalance={creditBalance} />
      <ShipOrderModal
        open={shipOpen}
        orderId={shipOrderId}
        token={token}
        onClose={() => {
          setShipOpen(false);
          setShipOrderId(null);
        }}
        onAfterClose={() => {
          fetchOrders();                 // ✅ liste yenile
          refreshCreditRef.current?.();  // ✅ credit chip yenile
        }}
      />
    </div>
    </ModuleAccessGuard>
  );
}
