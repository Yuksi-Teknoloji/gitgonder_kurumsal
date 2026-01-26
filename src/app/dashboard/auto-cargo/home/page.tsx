//src/app/dashboard/auto-cargo/home/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import CreditTopUpModal from "@/src/components/credit/CreditTopUpModal";
import CreditChip from "@/src/components/credit/CreditChip";

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

type Metric = { label: string;  href?: string };
const METRICS: Metric[] = [
  { label: "Kargo Oluşturulmayan", href: "/dashboard/auto-cargo/cargo-list" },
  { label: "Kargoya Teslim Bekleyenler", href: "/dashboard/auto-cargo/cargo-list" },
  { label: "Kargoya Teslim Edilmiş/Yolda", href: "/dashboard/auto-cargo/cargo-list" },
  { label: "Askıdaki Siparişler",href: "/dashboard/auto-cargo/cargo-list" },
  { label: "Teslim Edilenler", href: "/dashboard/auto-cargo/cargo-list" },
  { label: "İade Edilenler", href: "/dashboard/auto-cargo/cargo-list" },
  { label: "İptal Edilenler", href: "/dashboard/auto-cargo/cargo-list" },
  { label: "Tüm Siparişler", href: "/dashboard/auto-cargo/cargo-list" },
];

export default function AutoCargoHomePage() {
  const [range, setRange] = React.useState<"30" | "7" | "1">("30");

  const [creditBalance] = React.useState<number>(0);
  const [creditOpen, setCreditOpen] = React.useState(false);
  const refreshCreditRef = React.useRef<null | (() => void)>(null);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5 shadow-sm soft-card border border-neutral-200 rounded-2xl bg-white">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">Merhaba, Kurumsal Üyemiz</h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Tek bir bakışta sorunsuz kargo yönetimi. Operasyonlarınızı kolayca takip edin, yönetin ve optimize edin.
          </p>
        </div>

        <div className="flex shrink-0 items-start sm:items-start">
          <CreditChip
            onTopUp={({ refreshCredit } = {}) => {
              refreshCreditRef.current = refreshCredit || null;
              setCreditOpen(true);
            }}
          />
        </div>
      </div>
      {/* 3 big cards */}
      <div className="mt-4 sm:mt-5 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <CardLink
          title="Kargo Oluştur"
          subtitle="Siparişlerin için hızlıca kargo oluştur."
          icon={<IconPlus className="h-5 w-5" />}
          tone="indigo"
          href="/dashboard/auto-cargo/create-cargo"
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
      <div className="mt-4 sm:mt-6 rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-neutral-900">Hızlı Genel Bakış</h2>
            <span className="text-xs text-neutral-400">ⓘ</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
              className="h-9 w-full sm:w-auto rounded-lg border border-neutral-200 bg-white px-3 text-xs sm:text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="30">Son 30 gün</option>
              <option value="7">Son 7 gün</option>
              <option value="1">Bugün</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </div>
      </div>
      <CreditTopUpModal open={creditOpen} onOpenChange={setCreditOpen} creditBalance={creditBalance} />
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
    <Link href={href} className={cn("group rounded-xl border p-4 sm:p-5 transition hover:shadow-sm", toneStyles)}>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={cn("h-9 w-9 sm:h-11 sm:w-11 rounded-full flex items-center justify-center shrink-0", iconStyles)}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-semibold text-neutral-900">{title}</div>
          <div className="mt-1 text-xs sm:text-sm text-neutral-500">{subtitle}</div>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 text-xs sm:text-sm font-semibold text-neutral-700 opacity-0 transition group-hover:opacity-100">
        Git →
      </div>
    </Link>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const content = (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 sm:p-4 hover:bg-neutral-50 transition">
      <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-neutral-500 leading-tight">{metric.label}</div>
      <div className="mt-2 text-xs sm:text-sm font-semibold text-indigo-600">Görüntüle →</div>
    </div>
  );

  return metric.href ? <Link href={metric.href}>{content}</Link> : content;
}
