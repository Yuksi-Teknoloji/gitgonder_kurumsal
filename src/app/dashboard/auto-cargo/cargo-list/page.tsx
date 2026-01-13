//src/app/dashboard/auto-cargo/cargo-list/page.tsx
"use client";

import CreditTopUpModal from "@/src/components/credit/CreditTopUpModal";
import CreditChip from "@/src/components/credit/CreditChip";
import * as React from "react";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

type TabKey =
  | "WAITING_CREATE"
  | "WAITING_DELIVERY"
  | "IN_TRANSIT"
  | "PENDING_ORDERS"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED"
  | "ALL";

type Row = {
  id: string; // OID-...
  orderDate: string; // dd/mm/yyyy hh:mm
  status:
  | "İptal edildi"
  | "Teslim edildi"
  | "İade edildi"
  | "Kargo Oluşturulmayı Bekleyenler"
  | "Kargoya Teslim Bekleyenler"
  | "Kargoya Teslim Edilmiş/Yolda"
  | "Askıda"
  | "Tüm Siparişler";
  senderAddress: string; // My Pickup Location
  customerName: string;

  // NEW (for filter/header consistency)
  brandName?: string;
  receiverAddress?: string;
  destinationCity?: string;

  invoiceAmount: string; // ₺ 350,00
  paymentType: "Kapıda Ödeme" | "Ödendi" | "Ödenmedi";

  // keep existing optional fields (no UI in filter anymore)
  shipmentNumber?: string;
  forwardCarrier?: string;
  reverseShipmentNumber?: string;
  reverseCarrier?: string;
  channelCargoAmount?: string; // ₺ 0,00
  trackingNumber?: string;
  driverNote?: string;
};

const TABS: Array<{ key: TabKey; label: string; badge?: number }> = [
  { key: "WAITING_CREATE", label: "Kargo Oluşturulmayı Bekleyenler", badge: 0 },
  { key: "WAITING_DELIVERY", label: "Kargoya Teslim Bekleyenler", badge: 0 },
  { key: "IN_TRANSIT", label: "Kargoya Teslim Edilmiş/Yolda", badge: 0 },
  { key: "PENDING_ORDERS", label: "Askıdaki Siparişler", badge: 0 },
  { key: "DELIVERED", label: "Teslim Edilenler" },
  { key: "RETURNED", label: "İade Edilenler" },
  { key: "CANCELLED", label: "İptal Edilenler" },
  { key: "ALL", label: "Tüm Siparişler" },
];

const MOCK_ROWS: Row[] = [
  {
    id: "OID-155298-1012",
    orderDate: "07/01/2026 15:41",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "deneme",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 350,00",
    paymentType: "Kapıda Ödeme",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1011",
    orderDate: "06/01/2026 14:45",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "emre",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 1,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1010",
    orderDate: "06/01/2026 14:45",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "emre",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 100,00",
    paymentType: "Kapıda Ödeme",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1009",
    orderDate: "05/01/2026 17:10",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "Emre",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 50,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1008",
    orderDate: "05/01/2026 16:35",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "Emre",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 1,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1007",
    orderDate: "05/01/2026 16:28",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "Ahmet",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 100,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1006",
    orderDate: "05/01/2026 16:27",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "Ahmet",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 1,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1005",
    orderDate: "05/01/2026 16:26",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "Mehmet",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 1,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1004",
    orderDate: "05/01/2026 16:25",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "Emre",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 1,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1003",
    orderDate: "05/01/2026 16:24",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "Emre",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 100,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1002",
    orderDate: "05/01/2026 16:22",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "Emre",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 1,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
  {
    id: "OID-155298-1001",
    orderDate: "05/01/2026 16:20",
    status: "İptal edildi",
    senderAddress: "My Pickup Location",
    brandName: "",
    customerName: "Emre",
    receiverAddress: "",
    destinationCity: "",
    invoiceAmount: "₺ 10,00",
    paymentType: "Ödendi",
    channelCargoAmount: "₺ 0,00",
  },
];

function StatusPill({ status }: { status: Row["status"] }) {
  const cls =
    status === "İptal edildi"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status === "Teslim edildi"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : status === "Kargoya Teslim Edilmiş/Yolda"
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-neutral-200 bg-neutral-50 text-neutral-700";

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", cls)}>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white text-[10px]">
        ×
      </span>
      {status}
    </span>
  );
}

function Label({ text }: { text: string }) {
  return <div className="mb-2 text-xs font-semibold text-neutral-600">{text}</div>;
}

export default function CargoListPage() {
  const [tab, setTab] = React.useState<TabKey>("ALL");

  // toolbar
  const [bulkMenu, setBulkMenu] = React.useState("Kargo Oluştur");
  const [orderListUploadOpen, setOrderListUploadOpen] = React.useState(false);

  // filters (ONLY screenshot fields)
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
  const allChecked = React.useMemo(() => {
    const ids = MOCK_ROWS.map((r) => r.id);
    return ids.length > 0 && ids.every((id) => selected[id]);
  }, [selected]);

  const [pageSize, setPageSize] = React.useState(10);
  const [page, setPage] = React.useState(1);

  const filteredRows = React.useMemo(() => {
    let rows = [...MOCK_ROWS];

    if (filters.orderNo.trim())
      rows = rows.filter((r) => r.id.toLowerCase().includes(filters.orderNo.trim().toLowerCase()));

    if (filters.customerName.trim())
      rows = rows.filter((r) => r.customerName.toLowerCase().includes(filters.customerName.trim().toLowerCase()));

    if (filters.senderAddress.trim())
      rows = rows.filter((r) =>
        (r.senderAddress ?? "").toLowerCase().includes(filters.senderAddress.trim().toLowerCase())
      );

    if (filters.brandName.trim())
      rows = rows.filter((r) => (r.brandName ?? "").toLowerCase().includes(filters.brandName.trim().toLowerCase()));

    if (filters.receiverAddress.trim())
      rows = rows.filter((r) =>
        (r.receiverAddress ?? "").toLowerCase().includes(filters.receiverAddress.trim().toLowerCase())
      );

    if (filters.destinationCity.trim())
      rows = rows.filter((r) =>
        (r.destinationCity ?? "").toLowerCase().includes(filters.destinationCity.trim().toLowerCase())
      );

    if (filters.status) rows = rows.filter((r) => r.status === (filters.status as any));
    if (filters.paymentType) rows = rows.filter((r) => r.paymentType === (filters.paymentType as any));

    if (tab === "CANCELLED") rows = rows.filter((r) => r.status === "İptal edildi");
    if (tab === "RETURNED") rows = rows.filter((r) => r.status === "İade edildi");
    if (tab === "DELIVERED") rows = rows.filter((r) => r.status === "Teslim edildi");
    if (tab === "WAITING_CREATE") rows = rows.filter((r) => r.status === "Kargo Oluşturulmayı Bekleyenler");
    if (tab === "WAITING_DELIVERY") rows = rows.filter((r) => r.status === "Kargoya Teslim Bekleyenler");
    if (tab === "IN_TRANSIT") rows = rows.filter((r) => r.status === "Kargoya Teslim Edilmiş/Yolda");
    if (tab === "PENDING_ORDERS") rows = rows.filter((r) => r.status === "Askıda");
    if (tab === "ALL") return rows;

    return rows;
  }, [filters, tab]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);

  const pagedRows = React.useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageSafe, pageSize]);

  React.useEffect(() => {
    setPage(1);
  }, [
    tab,
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

  function toggleAll() {
    const next: Record<string, boolean> = { ...selected };
    if (allChecked) {
      for (const r of pagedRows) next[r.id] = false;
    } else {
      for (const r of pagedRows) next[r.id] = true;
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

  const [creditBalance] = React.useState<number>(0);
  const [creditOpen, setCreditOpen] = React.useState(false);

  // ✅ NEW: responsive grid (fits page, minimal/no horizontal scroll)
  const GRID =
    "grid-cols-[4px_minmax(120px,1.1fr)_minmax(120px,1fr)_minmax(80px,1.6fr)_minmax(100px,1.1fr)_minmax(100px,1fr)_minmax(100px,1.1fr)_minmax(100px,1.4fr)_minmax(80px,0.9fr)_minmax(100px,1fr)_minmax(80px,1fr)]";

  // ✅ NEW: remove forced huge min width, let it fit container
  const MINW = "min-w-0";

  return (
    <div className="px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center">📦</div>
          <h1 className="text-2xl font-semibold text-neutral-900">Kargo</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={() => alert("Mock: Harita Görünümü")}
          >
            🗺️ Harita Görünümü
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={() => setOrderListUploadOpen(true)}
          >
            ☁️ Sipariş Listesi Yükle
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            onClick={() => alert("Mock: Siparişi Ekle")}
          >
            + Siparişi Ekle
          </button>
          <CreditChip creditBalance={creditBalance} onTopUp={() => setCreditOpen(true)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 border-b border-neutral-200">
        <div className="flex flex-wrap gap-6">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative pb-3 text-sm font-semibold text-neutral-600 hover:text-neutral-900",
                  active && "text-neutral-900"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {t.label}
                  {typeof t.badge === "number" ? (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-neutral-100 px-2 text-xs font-bold text-neutral-600">
                      {t.badge}
                    </span>
                  ) : null}
                </span>
                {active ? <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-indigo-600" /> : null}
              </button>
            );
          })}
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
            onClick={() => alert("Mock: Export/Download")}
            title="İndir"
          >
            ⬇
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {/* keep overflow-x-auto for very small screens, but it should fit normally */}
        <div className="overflow-x-auto">
          {/* Header + Filter */}
          <div className={cn(MINW, "border-b border-neutral-200 bg-neutral-50 px-3 py-3")}>
            {/* Header row */}
            <div className={cn("grid items-center gap-3 text-xs font-semibold text-neutral-600", GRID)}>
              <div className="flex items-center justify-center">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
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

              <select
                value={filters.senderAddress}
                onChange={(e) => setFilters((f) => ({ ...f, senderAddress: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
              >
                <option value="">Seç</option>
                <option value="My Pickup Location">My Pickup Location</option>
              </select>

              <select
                value={filters.brandName}
                onChange={(e) => setFilters((f) => ({ ...f, brandName: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
              >
                <option value="">Seç</option>
              </select>

              <input
                value={filters.customerName}
                onChange={(e) => setFilters((f) => ({ ...f, customerName: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder=""
              />

              <input
                value={filters.receiverAddress}
                onChange={(e) => setFilters((f) => ({ ...f, receiverAddress: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 px-3 text-sm"
                placeholder=""
              />

              <select
                value={filters.destinationCity}
                onChange={(e) => setFilters((f) => ({ ...f, destinationCity: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
              >
                <option value="">Seç</option>
              </select>

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
            {pagedRows.map((r) => (
              <div key={r.id} className="px-3 py-3">
                <div className={cn("grid items-center gap-3 text-sm", GRID)}>
                  <div className="flex items-center justify-center">
                    <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleOne(r.id)} />
                  </div>

                  <div className="min-w-0 truncate font-semibold text-indigo-700">{r.id}</div>
                  <div className="min-w-0 truncate text-neutral-700">{r.orderDate}</div>
                  <div className="min-w-0">
                    <StatusPill status={r.status} />
                  </div>
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

            {pagedRows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-neutral-500">Sonuç bulunamadı.</div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-neutral-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span>Topl...</span>
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
            <div className="text-sm text-neutral-600">/ {total}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
              title="Önceki"
            >
              ‹
            </button>

            <div className="inline-flex items-center gap-2">
              {Array.from({ length: Math.min(3, totalPages) }).map((_, idx) => {
                const p = idx + 1;
                const active = p === pageSafe;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={cn(
                      "h-9 w-9 rounded-lg border text-sm font-semibold",
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    {p}
                  </button>
                );
              })}

              {totalPages > 3 ? (
                <>
                  <span className="px-1 text-sm text-neutral-500">…</span>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className={cn(
                      "h-9 w-9 rounded-lg border text-sm font-semibold",
                      pageSafe === totalPages
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    {totalPages}
                  </button>
                </>
              ) : null}
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              title="Sonraki"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Upload modal (mock) */}
      {orderListUploadOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div className="text-base font-semibold text-neutral-900">Sipariş Listesi Yükle</div>
              <button
                type="button"
                className="h-9 w-9 rounded-lg hover:bg-neutral-100 text-neutral-600"
                onClick={() => setOrderListUploadOpen(false)}
                aria-label="Kapat"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                <div className="text-sm font-semibold text-neutral-800">Dosyanı buraya sürükle bırak</div>
                <div className="mt-1 text-xs text-neutral-500">CSV / XLSX (mock). Endpoint gelince upload bağlanacak.</div>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  onClick={() => alert("Mock: dosya seç")}
                >
                  Dosya Seç
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
              <button
                type="button"
                className="text-sm font-semibold text-neutral-700 hover:text-neutral-900"
                onClick={() => setOrderListUploadOpen(false)}
              >
                İptal
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                onClick={() => {
                  alert("Mock: yükle");
                  setOrderListUploadOpen(false);
                }}
              >
                Yükle
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <CreditTopUpModal open={creditOpen} onOpenChange={setCreditOpen} creditBalance={creditBalance} />
    </div>
  );
}
