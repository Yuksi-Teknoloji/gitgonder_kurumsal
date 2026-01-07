"use client";

import * as React from "react";
import Link from "next/link";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

function IconPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconChain(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"
      />
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
      />
    </svg>
  );
}
function IconCalculator(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 7h8" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 11h2M12 11h2M16 11h0" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 15h2M12 15h2M16 15h0" />
    </svg>
  );
}

type Metric = { label: string; value: number; href?: string };
const METRICS: Metric[] = [
  { label: "Kargo Oluşturulmayan", value: 0, href: "__PATH_WAITING_CREATE__" },
  { label: "Kargoya Teslim Bekleyenler", value: 0, href: "__PATH_WAITING_DELIVERY__" },
  { label: "Kargoya Teslim Edilmiş/Yolda", value: 0, href: "__PATH_IN_TRANSIT__" },
  { label: "Askıdaki Siparişler", value: 0, href: "__PATH_PENDING__" },
  { label: "Teslim Edilenler", value: 0, href: "__PATH_DELIVERED__" },
  { label: "İade Edilenler", value: 0, href: "__PATH_RETURNED__" },
  { label: "İptal Edilenler", value: 12, href: "__PATH_CANCELED__" },
  { label: "Tüm Siparişler", value: 12, href: "__PATH_ALL__" },
];

export default function AutoCargoHomePage() {
  const [range, setRange] = React.useState<"30" | "7" | "1">("30");

  return (
    <div className="px-6 py-5 shadow-sm soft-card p-4 border border-neutral-200 rounded-2xl bg-white ">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Merhaba, Kurumsal Üyemiz</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Tek bir bakışta sorunsuz kargo yönetimi. Operasyonlarınızı kolayca takip edin, yönetin ve optimize edin.
          </p>
        </div>
      </div>

      {/* 3 big cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CardLink
          title="Kargo Oluştur"
          subtitle="Siparişlerin için hızlıca kargo oluştur."
          icon={<IconPlus className="h-5 w-5" />}
          tone="indigo"
          href="/dashboard/auto-cargo/create-cargo"
        />

        <CardLink
          title="Satış kanalınızı bağlayın"
          subtitle="Siparişlerin otomatik aksın, zahmet azal­sın."
          icon={<IconChain className="h-5 w-5" />}
          tone="emerald"
          href="__PATH_CONNECT_CHANNEL__"
        />

        <CardLink
          title="Kargo Ücretleri"
          subtitle="Şehir, hizmet ve teslim tipine göre fiyatları görüntüle."
          icon={<IconCalculator className="h-5 w-5" />}
          tone="amber"
          href="/dashboard/auto-cargo/cargo-prices"
        />
      </div>

      {/* Quick Overview */}
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-neutral-900">Hızlı Genel Bakış</h2>
            <span className="text-xs text-neutral-400">ⓘ</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="30">Son 30 gün</option>
              <option value="7">Son 7 gün</option>
              <option value="1">Bugün</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardLink({
  title,
  subtitle,
  icon,
  tone,
  href,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: "indigo" | "emerald" | "amber";
  href: string;
}) {
  const toneStyles =
    tone === "indigo"
      ? "bg-indigo-50 border-indigo-100"
      : tone === "emerald"
        ? "bg-emerald-50 border-emerald-100"
        : "bg-amber-50 border-amber-100";

  const iconStyles =
    tone === "indigo" ? "text-indigo-700 bg-indigo-600/10" : tone === "emerald" ? "text-emerald-700 bg-emerald-600/10" : "text-amber-800 bg-amber-600/10";

  return (
    <Link href={href} className={cn("group rounded-xl border p-5 transition hover:shadow-sm", toneStyles)}>
      <div className="flex items-center gap-3">
        <div className={cn("h-11 w-11 rounded-full flex items-center justify-center", iconStyles)}>{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-neutral-900">{title}</div>
          <div className="mt-1 text-sm text-neutral-500">{subtitle}</div>
        </div>
      </div>

      <div className="mt-4 text-sm font-semibold text-neutral-700 opacity-0 transition group-hover:opacity-100">
        Git →
      </div>
    </Link>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const content = (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{metric.label}</div>
      <div className="mt-2 text-2xl font-semibold text-neutral-900">{metric.value}</div>
      <div className="mt-2 text-sm font-semibold text-indigo-600">Görüntüle →</div>
    </div>
  );

  return metric.href ? <Link href={metric.href}>{content}</Link> : content;
}
