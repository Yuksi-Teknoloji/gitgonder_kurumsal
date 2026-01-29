//src/app/dashboard/auto-cargo/cargo-package/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";

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

function getBearerToken() {
  try {
    return getAuthToken() || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token") || "";
  } catch {
    return getAuthToken() || "";
  }
}

function toNum(v: any, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function clampInt(v: any, min = 1, max = 1_000_000) {
  const n = Math.floor(toNum(v, min));
  return Math.max(min, Math.min(max, n));
}

/* ========= Types ========= */

type BoxItem = {
  id?: number | null;
  boxName?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
};

type GetBoxesResponse = {
  success: boolean;
  message: string | null;
  warnings: any;
  otoErrorCode: any;
  otoErrorMessage: string | null;
  boxes: BoxItem[];
};

type AddBoxRequest = {
  name: string;
  length: number;
  width: number;
  height: number;
};

type AddBoxResponse = {
  success: boolean;
  message: string | null;
  warnings: any;
  otoErrorCode: any;
  otoErrorMessage: string | null;
};

async function apiGetBoxes(bearer: string, name?: string) {
  const qs = name?.trim() ? `?name=${encodeURIComponent(name.trim())}` : "";
  const res = await fetch(`/yuksi/oto/inventory/box${qs}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${bearer}`,
    },
  });

  const j = await readJson<GetBoxesResponse>(res);
  if (res.status === 401 || res.status === 403) throw new Error("AUTH");
  if (!res.ok || !j?.success) throw new Error(pickMsg(j, `Kutu listesi alınamadı (HTTP ${res.status})`));

  return {
    ...j,
    boxes: Array.isArray(j.boxes) ? j.boxes : [],
  } as GetBoxesResponse;
}

async function apiAddBox(bearer: string, body: AddBoxRequest) {
  const res = await fetch(`/yuksi/oto/inventory/add-box`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(body),
  });

  const j = await readJson<AddBoxResponse>(res);
  if (res.status === 401 || res.status === 403) throw new Error("AUTH");
  if (!res.ok || !j?.success) throw new Error(pickMsg(j, `Kutu eklenemedi (HTTP ${res.status})`));
  return j;
}

export default function CargoPackagePage() {
  const router = useRouter();
  const token = React.useMemo(getBearerToken, []);

  // list
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string>("");
  const [data, setData] = React.useState<GetBoxesResponse | null>(null);

  // search
  const [qName, setQName] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"id_desc" | "name_asc" | "volume_asc" | "volume_desc">("id_desc");

  // create modal
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<AddBoxRequest>({
    name: "",
    length: 10,
    width: 10,
    height: 10,
  });

  React.useEffect(() => {
    if (!token) router.replace("/");
  }, [token, router]);

  async function load(name?: string) {
    setErr("");
    setLoading(true);
    try {
      if (!token) {
        router.replace("/");
        return;
      }
      const j = await apiGetBoxes(token, name);
      setData(j);
    } catch (e: any) {
      if (String(e?.message) === "AUTH") {
        router.replace("/");
        return;
      }
      setErr(String(e?.message || e || "Bilinmeyen hata"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = React.useMemo(() => {
    const arr = data?.boxes ? [...data.boxes] : [];
    const volume = (b: BoxItem) => toNum(b.length, 0) * toNum(b.width, 0) * toNum(b.height, 0);

    if (sortBy === "id_desc") {
      arr.sort((a, b) => toNum(b.id, -1) - toNum(a.id, -1));
    } else if (sortBy === "name_asc") {
      arr.sort((a, b) => String(a.boxName || "").localeCompare(String(b.boxName || ""), "tr"));
    } else if (sortBy === "volume_asc") {
      arr.sort((a, b) => volume(a) - volume(b));
    } else if (sortBy === "volume_desc") {
      arr.sort((a, b) => volume(b) - volume(a));
    }
    return arr;
  }, [data, sortBy]);

  function validateAdd(): string | null {
    if (!String(form.name || "").trim()) return "Kutu adı zorunlu.";
    if (clampInt(form.length, 1) <= 0) return "Uzunluk 0'dan büyük olmalı.";
    if (clampInt(form.width, 1) <= 0) return "Genişlik 0'dan büyük olmalı.";
    if (clampInt(form.height, 1) <= 0) return "Yükseklik 0'dan büyük olmalı.";
    return null;
  }

  async function submitAdd() {
    setErr("");
    setSubmitting(true);
    try {
      if (!token) {
        router.replace("/");
        return;
      }

      const v = validateAdd();
      if (v) throw new Error(v);

      const body: AddBoxRequest = {
        name: String(form.name || "").trim(),
        length: clampInt(form.length, 1, 1_000_000),
        width: clampInt(form.width, 1, 1_000_000),
        height: clampInt(form.height, 1, 1_000_000),
      };

      await apiAddBox(token, body);
      setOpen(false);
      setForm({ name: "", length: 10, width: 10, height: 10 });
      await load(qName);
    } catch (e: any) {
      if (String(e?.message) === "AUTH") {
        router.replace("/");
        return;
      }
      setErr(String(e?.message || e || "Bilinmeyen hata"));
    } finally {
      setSubmitting(false);
    }
  }

  const total = list.length;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center shrink-0">
            📦
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">Kargo Paketi (Kutu) Yönetimi</h1>
            <div className="mt-1 text-sm text-neutral-600">Kutularını listele, ara ve yeni kutu ekle.</div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            className="flex-1 sm:flex-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            onClick={() => router.back()}
            title="Geri"
          >
            ‹ Geri
          </button>

          <button
            type="button"
            className="flex-1 sm:flex-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            onClick={() => load(qName)}
            disabled={loading}
            title="Yenile"
          >
            {loading ? "Yükleniyor…" : "Yenile"}
          </button>

          <button
            type="button"
            className="flex-1 sm:flex-none rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            onClick={() => setOpen(true)}
            disabled={loading}
            title="Yeni kutu ekle"
          >
            + Kutu Ekle
          </button>
        </div>
      </div>

      {/* Error */}
      {err ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 break-words">
          {err}
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex-1">
            <div className="text-xs font-semibold text-neutral-600">Kutu adı ile ara (opsiyonel)</div>
            <div className="mt-1 flex gap-2">
              <input
                value={qName}
                onChange={(e) => setQName(e.target.value)}
                placeholder="Örn: kırılabilir eşya"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="button"
                className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={() => load(qName)}
                disabled={loading}
              >
                Ara
              </button>
              <button
                type="button"
                className="h-10 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
                onClick={() => {
                  setQName("");
                  load("").catch(() => {});
                }}
                disabled={loading}
              >
                Temizle
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            <div className="text-xs font-semibold text-neutral-600 whitespace-nowrap">Sırala:</div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
              disabled={loading}
            >
              <option value="id_desc">En yeni</option>
              <option value="name_asc">İsim (A-Z)</option>
              <option value="volume_asc">Hacim (Artan)</option>
              <option value="volume_desc">Hacim (Azalan)</option>
            </select>

            <div className="ml-2 text-xs text-neutral-600">
              Toplam: <span className="font-semibold text-neutral-900">{total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="border-b border-neutral-200 bg-neutral-50 px-3 sm:px-4 py-3">
          <div className="text-sm font-semibold text-neutral-900">Kutular</div>
        </div>

        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
              Yükleniyor…
            </div>
          ) : !data ? (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
              Henüz veri yok. Yukarıdan “Yenile” veya “Ara” yapabilirsin.
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
              Kutu bulunamadı.
            </div>
          ) : (
            <div className="grid gap-3">
              {list.map((b, idx) => {
                const id = b.id ?? "-";
                const nm = b.boxName || "Kutu";
                const L = toNum(b.length, 0);
                const W = toNum(b.width, 0);
                const H = toNum(b.height, 0);
                const vol = L * W * H;

                return (
                  <div
                    key={`${String(b.id ?? idx)}-${idx}`}
                    className={cn("rounded-xl border border-neutral-200 bg-white p-3 sm:p-4 hover:bg-neutral-50 soft-card hover:shadow", )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 truncate text-sm font-semibold text-neutral-900">{nm}</div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                          <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 whitespace-nowrap">
                            Uzunluk: <span className="font-semibold text-neutral-800">{L}</span>
                          </span>
                          <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 whitespace-nowrap">
                            Genişlik: <span className="font-semibold text-neutral-800">{W}</span>
                          </span>
                          <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 whitespace-nowrap">
                            Yükseklik: <span className="font-semibold text-neutral-800">{H}</span>
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-right">
                        <div className="text-[11px] font-semibold text-neutral-600">Hacim (U×G×Y)</div>
                        <div className="mt-0.5 text-sm font-semibold text-neutral-900 tabular-nums">{vol}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Modal: Add Box ===== */}
      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => !submitting && setOpen(false)}
            aria-label="Kapat"
          />

          <div className="absolute left-1/2 top-1/2 w-[94vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border border-neutral-200">
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-neutral-900">Kutu Ekle</div>
              </div>

              <button
                type="button"
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Kapat
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="text-sm font-semibold text-neutral-800">Kutu Adı</div>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Örn: 40 desi"
                    className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-800">Uzunluk</div>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={form.length}
                      onChange={(e) => setForm((s) => ({ ...s, length: toNum(e.target.value, 1) }))}
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-neutral-800">Genişlik</div>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={form.width}
                      onChange={(e) => setForm((s) => ({ ...s, width: toNum(e.target.value, 1) }))}
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-neutral-800">Yükseklik</div>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={form.height}
                      onChange={(e) => setForm((s) => ({ ...s, height: toNum(e.target.value, 1) }))}
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="text-xs font-semibold text-neutral-600">Önizleme</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-800">
                    <span className="rounded-full border border-neutral-200 bg-white px-3 py-1">
                      {String(form.name || "").trim() || "İsimsiz"}
                    </span>
                    <span className="rounded-full border border-neutral-200 bg-white px-3 py-1">
                      {clampInt(form.length, 1)} × {clampInt(form.width, 1)} × {clampInt(form.height, 1)}
                    </span>
                    <span className="rounded-full border border-neutral-200 bg-white px-3 py-1">
                      Hacim:{" "}
                      {clampInt(form.length, 1) * clampInt(form.width, 1) * clampInt(form.height, 1)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submitAdd}
                  disabled={submitting}
                  className="mt-1 w-full rounded-xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
