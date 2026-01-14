//src/app/dashboard/auto-cargo/cargo-list/page.tsx
"use client";

import * as React from "react";
import CreditTopUpModal from "@/src/components/credit/CreditTopUpModal";
import CreditChip from "@/src/components/credit/CreditChip";
import { getAuthToken } from "@/src/utils/auth";
import { useRouter } from "next/navigation";

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

/* ========= Types ========= */
type RowStatusTr =
  | "İptal edildi"
  | "Teslim edildi"
  | "İade edildi"
  | "Kargo Oluşturulmayı Bekleyenler"
  | "Kargoya Teslim Bekleyenler"
  | "Kargoya Teslim Edilmiş/Yolda"
  | "Askıda"
  | "Tüm Siparişler";

type Row = {
  id: string; // orderId (OID gibi)
  orderDate: string;
  status: RowStatusTr;
  senderAddress: string;
  customerName: string;

  brandName?: string;
  receiverAddress?: string;
  destinationCity?: string;

  invoiceAmount: string;
  paymentType: "Kapıda Ödeme" | "Ödendi" | "Ödenmedi";

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

  paymentMethod?: string; // "paid" gibi
  shipmentNumber?: string;
  trackingURL?: string;
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

/* ========= Mappers ========= */
// API status -> TR label (best-effort)
function apiStatusToTr(s?: string): RowStatusTr {
  const x = String(s ?? "").toLowerCase().trim();

  if (!x) return "Tüm Siparişler";

  // örnek: backend "new" döndürüyor
  if (x === "new") return "Kargo Oluşturulmayı Bekleyenler";

  if (x.includes("waiting_create")) return "Kargo Oluşturulmayı Bekleyenler";
  if (x.includes("waiting_delivery")) return "Kargoya Teslim Bekleyenler";
  if (x.includes("in_transit") || x.includes("onway") || x.includes("on_way") || x.includes("shipped"))
    return "Kargoya Teslim Edilmiş/Yolda";
  if (x.includes("pending") || x.includes("hold")) return "Askıda";
  if (x.includes("delivered")) return "Teslim edildi";
  if (x.includes("returned")) return "İade edildi";
  if (x.includes("cancel") || x.includes("canceled") || x.includes("cancelled")) return "İptal edildi";

  // tanımsız durumlar için "Tüm Siparişler" demek yerine daha mantıklı: Askıda
  // ama UI’da kafa karıştırmasın diye "Tüm Siparişler"e düşürelim.
  return "Tüm Siparişler";
}

function paymentToTr(p?: string): Row["paymentType"] {
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

function toRow(o: ApiOrder): Row {
  const id = o.orderId || o.id || "-";
  const statusTr = apiStatusToTr(o.status);

  return {
    id,
    orderDate: o.orderDate || "-",
    status: statusTr,
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

  React.useEffect(() => {
    if (!open || !orderId) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      setData(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-lg" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-neutral-900">Sipariş Detayı</div>
            <div className="mt-1 text-xs text-neutral-500 truncate">Order ID: {orderId}</div>
          </div>
          <button
            type="button"
            className="h-9 w-9 rounded-lg hover:bg-neutral-100 text-neutral-600"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-auto px-5 py-4">
          {loading ? (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">Yükleniyor…</div>
          ) : err ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>
          ) : data ? (
            <div className="space-y-5">
              {/* Top info */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div className="text-xs font-semibold text-neutral-600">Durum</div>
                  <div className="mt-2 text-sm font-semibold text-neutral-900">{data.status}</div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div className="text-xs font-semibold text-neutral-600">Tracking URL</div>
                  <div className="mt-2 text-sm text-neutral-900 break-all">
                    {data.trackingURL ? (
                      <a className="text-indigo-700 underline" href={data.trackingURL} target="_blank" rel="noreferrer">
                        {data.trackingURL}
                      </a>
                    ) : (
                      <span className="text-neutral-500">Yok</span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div className="text-xs font-semibold text-neutral-600">Kalem sayısı</div>
                  <div className="mt-2 text-sm font-semibold text-neutral-900">{data.items?.length ?? 0}</div>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="text-sm font-semibold text-neutral-900">Ürünler</div>
                <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200">
                  <div className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-2 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
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
                        className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-2 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0 truncate font-semibold text-neutral-800">{it.sku}</div>
                        <div className="text-neutral-700">{it.quantity ?? "-"}</div>
                        <div className="text-neutral-700">{it.price ?? "-"}</div>
                        <div className="text-neutral-700">{it.taxAmount ?? "-"}</div>
                        <div className="text-neutral-700">{it.rowTotal ?? "-"}</div>
                      </div>
                    ))}

                    {(!data.items || data.items.length === 0) && (
                      <div className="px-4 py-8 text-center text-sm text-neutral-500">Ürün yok.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status history */}
              <div>
                <div className="text-sm font-semibold text-neutral-900">Durum Geçmişi</div>
                <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200">
                  <div className="grid grid-cols-[1fr_0.6fr_2fr] gap-2 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
                    <div>Tarih</div>
                    <div>Status</div>
                    <div>Açıklama</div>
                  </div>

                  <div className="divide-y divide-neutral-100">
                    {(data.statusHistory ?? []).map((h) => (
                      <div key={h.id} className="grid grid-cols-[1fr_0.6fr_2fr] gap-2 px-3 py-2 text-sm">
                        <div className="text-neutral-700">{h.date}</div>
                        <div className="font-semibold text-neutral-800">{h.status}</div>
                        <div className="text-neutral-700">{h.description}</div>
                      </div>
                    ))}

                    {(!data.statusHistory || data.statusHistory.length === 0) && (
                      <div className="px-4 py-8 text-center text-sm text-neutral-500">Kayıt yok.</div>
                    )}
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

export default function CargoListPage() {
  const token = React.useMemo(getAuthToken, []);

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsOrderId, setDetailsOrderId] = React.useState<string | null>(null);

  function openDetails(orderId: string) {
    setDetailsOrderId(orderId);
    setDetailsOpen(true);
  }

  // toolbar
  const [bulkMenu] = React.useState("Kargo Oluştur");
  const [orderListUploadOpen, setOrderListUploadOpen] = React.useState(false);

  // filters
  const [filters, setFilters] = React.useState({
    orderNo: "",
    orderDate: "",
    status: "",
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
    "grid-cols-[4px_minmax(120px,1.1fr)_minmax(120px,1fr)_minmax(80px,1.6fr)_minmax(100px,1.1fr)_minmax(100px,1fr)_minmax(100px,1.1fr)_minmax(100px,1.4fr)_minmax(80px,0.9fr)_minmax(100px,1fr)_minmax(80px,1fr)]";
  const MINW = "min-w-0";

  // Fetch orders (sadece tüm siparişler)
  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
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
          status: "", // ✅ ALL
        }),
      });

      const data = await readJson<OrdersListResponse>(res);

      if (!res.ok || !data?.success) {
        throw new Error(pickMsg(data, `Siparişler alınamadı (HTTP ${res.status})`));
      }

      const mapped = Array.isArray(data.orders) ? data.orders.map(toRow) : [];

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
  }, [page, pageSize, token]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset page when pageSize/filters change
  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pageSize,
    filters.orderNo,
    filters.customerName,
    filters.status,
    filters.paymentType,
    filters.senderAddress,
    filters.brandName,
    filters.receiverAddress,
    filters.destinationCity,
    filters.orderDate,
    filters.invoiceMin,
    filters.invoiceMax,
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
    if (filters.status) r = r.filter((x) => x.status === (filters.status as any));
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
      status: "",
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
  const router = useRouter();
  const pageSafe = Math.min(page, apiTotalPages);

  return (
    <div className="px-6 py-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center">📦</div>
          <h1 className="text-2xl font-semibold text-neutral-900">Kargo</h1>
        </div>

        {/* right top area */}
        <div className="flex w-full items-start justify-end gap-3">
          <button
            type="button"
            className="order-1 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            onClick={() => router.push("/dashboard/auto-cargo/create-cargo")}
          >
            + Sipariş Ekle
          </button>

          <div className="order-2 shrink-0 self-start">
            <CreditChip creditBalance={creditBalance} onTopUp={() => setCreditOpen(true)} />
          </div>
        </div>
      </div>

      {/* Toolbar row */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              onClick={() => {
                alert(`Mock: ${bulkMenu} (${Object.values(selected).filter(Boolean).length} seçili)`);
              }}
            >
              📦 {bulkMenu}
              <span className="opacity-90">▾</span>
            </button>
          </div>

          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={() => alert("Mock: Filtre paneli")}
          >
            ⛭
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={resetFilters}
            title="Filtreleri sıfırla"
          >
            ↺
          </button>
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={() => fetchOrders()}
            title="Yenile"
          >
            ⟳
          </button>
        </div>
      </div>

      {/* Info strip */}
      <div className="mt-3">
        {loading ? (
          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">Yükleniyor…</div>
        ) : err ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>
        ) : null}
      </div>

      {/* Table */}
      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <div className={cn(MINW, "border-b border-neutral-200 bg-neutral-50 px-3 py-3")}>
            {/* Header row */}
            <div className={cn("grid items-center gap-3 text-xs font-semibold text-neutral-600", GRID)}>
              <div className="flex items-center justify-center">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} onClick={(e) => e.stopPropagation()} />
              </div>
              <div className="min-w-0 truncate whitespace-nowrap">Sipariş Numarası</div>
              <div className="min-w-0 truncate whitespace-nowrap">Sipariş Tarihi</div>
              <div className="min-w-0 truncate whitespace-nowrap">Durum</div>
              <div className="min-w-0 truncate whitespace-nowrap">Gönderici Adresi</div>
              <div className="min-w-0 truncate whitespace-nowrap">Marka Adı</div>
              <div className="min-w-0 truncate whitespace-nowrap">Müşteri Adı</div>
              <div className="min-w-0 truncate whitespace-nowrap">Alıcı Adresi</div>
              <div className="min-w-0 truncate whitespace-nowrap">Varış Şehri</div>
              <div className="min-w-0 truncate whitespace-nowrap">Sipariş Tutarı</div>
              <div className="min-w-0 truncate whitespace-nowrap">Ödeme Türü</div>
            </div>

            {/* Filter row */}
            <div className={cn("mt-3 grid items-center gap-3", GRID)}>
              <div />

              <input
                value={filters.orderNo}
                onChange={(e) => setFilters((f) => ({ ...f, orderNo: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder=""
              />

              <input
                value={filters.orderDate}
                onChange={(e) => setFilters((f) => ({ ...f, orderDate: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder=""
              />

              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
              >
                <option value="">Seç</option>
                <option value="İptal edildi">İptal edildi</option>
                <option value="Teslim edildi">Teslim edildi</option>
                <option value="İade edildi">İade edildi</option>
                <option value="Kargo Oluşturulmayı Bekleyenler">Kargo Oluşturulmayı Bekleyenler</option>
                <option value="Kargoya Teslim Bekleyenler">Kargoya Teslim Bekleyenler</option>
                <option value="Kargoya Teslim Edilmiş/Yolda">Kargoya Teslim Edilmiş/Yolda</option>
                <option value="Askıda">Askıda</option>
                <option value="Tüm Siparişler">Tüm Siparişler</option>
              </select>

              <input
                value={filters.senderAddress}
                onChange={(e) => setFilters((f) => ({ ...f, senderAddress: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
              />

              <input
                value={filters.brandName}
                onChange={(e) => setFilters((f) => ({ ...f, brandName: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
              />

              <input
                value={filters.customerName}
                onChange={(e) => setFilters((f) => ({ ...f, customerName: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
              />

              <input
                value={filters.receiverAddress}
                onChange={(e) => setFilters((f) => ({ ...f, receiverAddress: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
              />

              <input
                value={filters.destinationCity}
                onChange={(e) => setFilters((f) => ({ ...f, destinationCity: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
              />

              <div className="flex min-w-0 gap-2">
                <input
                  value={filters.invoiceMin}
                  onChange={(e) => setFilters((f) => ({ ...f, invoiceMin: e.target.value }))}
                  className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
                  placeholder="En az"
                />
                <input
                  value={filters.invoiceMax}
                  onChange={(e) => setFilters((f) => ({ ...f, invoiceMax: e.target.value }))}
                  className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
                  placeholder="En fazla"
                />
              </div>

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
                  <div className="min-w-0 truncate text-neutral-700">{r.status}</div>
                  <div className="min-w-0 truncate text-neutral-700">{r.senderAddress}</div>
                  <div className="min-w-0 truncate text-neutral-700">{r.brandName ?? ""}</div>
                  <div className="min-w-0 truncate text-neutral-700">{r.customerName}</div>
                  <div className="min-w-0 truncate text-neutral-700">{r.receiverAddress ?? ""}</div>
                  <div className="min-w-0 truncate text-neutral-700">{r.destinationCity ?? ""}</div>
                  <div className="min-w-0 truncate text-neutral-700">{r.invoiceAmount}</div>
                  <div className="min-w-0 truncate text-neutral-700">{r.paymentType}</div>
                </div>
              </div>
            ))}

            {!loading && filteredRows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-neutral-500">Sonuç bulunamadı.</div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-neutral-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span>Toplam: </span>
            <span className="font-semibold text-neutral-800">{apiTotal}</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="text-sm text-neutral-600">/ {apiTotal}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1 || loading}
              title="Önceki"
            >
              ‹
            </button>

            <div className="inline-flex items-center gap-2">
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
                      "h-9 w-9 rounded-lg border text-sm font-semibold",
                      active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    {p}
                  </button>
                );
              })}

              {apiTotalPages > 3 ? (
                <>
                  <span className="px-1 text-sm text-neutral-500">…</span>
                  <button
                    type="button"
                    onClick={() => setPage(apiTotalPages)}
                    disabled={loading}
                    className={cn(
                      "h-9 w-9 rounded-lg border text-sm font-semibold",
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
              className="h-9 w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
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
    </div>
  );
}
