"use client";

import React from "react";
import { getAuthToken } from "@/src/utils/auth";
import { ChartBar } from "@/src/components/chart/CorporateChart";

async function readJson<T = unknown>(
  res: Response
): Promise<T | string | null> {
  const t = await res.text();
  try {
    return t ? (JSON.parse(t) as T) : null;
  } catch {
    return t;
  }
}
const pickMsg = (j: any, fb: string) =>
  j?.message || j?.detail || j?.title || fb;

type CorporateJob = {
  id: string;
  totalPrice?: number;
  commissionRate?: number;
};

export default function Charts() {
  const token = React.useMemo(() => getAuthToken(), []);

  const headers: HeadersInit = React.useMemo(
    () => ({
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const [data, setData] = React.useState<CorporateJob[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function loadList() {
    setError(null);
    try {
      const res = await fetch(`/yuksi/corporate/jobs`, {
        headers,
        cache: "no-store",
      });
      const j: any = await readJson(res);
      if (!res.ok || j?.success === false)
        throw new Error(pickMsg(j, `HTTP ${res.status}`));
      const list = Array.isArray(j?.data) ? j.data : [];
      const mapped: CorporateJob[] = list.map((x: any) => ({
        id: String(x?.id),
        totalPrice: x?.totalPrice != null ? Number(x.totalPrice) : undefined,
        commissionRate:
          x?.commissionRate != null ? Number(x.commissionRate) : undefined,
      }));
      setData(mapped);
    } catch (e: any) {
      setError(e?.message || "Kayıtlar alınamadı.");
      setData([]);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    loadList();
  }, []);

  if (error) {
    return (
      <div className="p-4 sm:p-10 text-rose-600 whitespace-pre-wrap break-words">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Grafikler</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Kurumsal üye komisyon istatistikleri
        </p>
      </div>

      <div className="w-full bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 sm:p-4 border-b border-neutral-200">
          <span className="text-sm sm:text-base font-semibold text-neutral-900">Kurumsal Üye Komisyonları</span>
          <span className="bg-gray-100 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap">
            Toplam: {data.reduce((sum, job) => sum + (job.totalPrice! * (job.commissionRate! / 100) || 0), 0).toFixed(2)}₺
          </span> 
        </div>
        
        <div className="p-3 sm:p-4">
          <div className="w-full h-[250px] sm:h-[300px] md:h-[350px] min-w-0">
            <ChartBar data={data}></ChartBar>
          </div>
        </div>
      </div>
    </div>
  );
}
