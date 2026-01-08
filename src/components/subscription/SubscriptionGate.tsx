// src/components/subscription/SubscriptionGate.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";

type GuardRes = { success: boolean; data?: { hasSubscription?: boolean; warning?: any } };

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

export function SubscriptionGate({
  children,
  subscribePath = "/dashboard/corporate/subscribe",
}: {
  children: React.ReactNode;
  subscribePath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let alive = true;

    const run = async () => {
      // subscribe sayfasındaysan gate uygulama (sonsuz loop olmasın)
      if (pathname && pathname.startsWith(subscribePath)) {
        if (alive) setChecking(false);
        return;
      }

      const bearer = getBearerToken();
      if (!bearer) {
        router.replace("/");
        return;
      }

      try {
        const res = await fetch("/yuksi/corporate/subscription-guard", {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${bearer}`,
          },
        });

        const json = await readJson<GuardRes>(res);

        // token invalid vs.
        if (res.status === 401 || res.status === 403) {
          router.replace("/");
          return;
        }

        if (!res.ok || json?.success === false) {
          // guard bozulursa, güvenli tarafta kal: subscribe'a at
          router.replace(subscribePath);
          return;
        }

        const has = !!json?.data?.hasSubscription;
        if (!has) router.replace(subscribePath);
      } catch {
        // network hatasında da güvenli tarafta kal
        router.replace(subscribePath);
      } finally {
        if (alive) setChecking(false);
      }
    };

    run();

    return () => {
      alive = false;
    };
  }, [router, pathname, subscribePath]);

  if (checking) {
    return <div className="p-6 text-sm text-neutral-600">Abonelik kontrol ediliyor…</div>;
  }

  return <>{children}</>;
}
