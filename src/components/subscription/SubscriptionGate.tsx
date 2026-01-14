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
      console.log("[SubscriptionGate] Starting check, pathname:", pathname);

      // subscribe sayfasındaysan gate uygulama (sonsuz loop olmasın)
      if (pathname && pathname.startsWith(subscribePath)) {
        console.log("[SubscriptionGate] On subscribe page, bypassing");
        if (alive) setChecking(false);
        return;
      }

      // onboarding sayfalarındaysan gate uygulama
      if (pathname && pathname.startsWith("/onboarding")) {
        console.log("[SubscriptionGate] On onboarding page, bypassing");
        if (alive) setChecking(false);
        return;
      }

      const bearer = getBearerToken();
      console.log("[SubscriptionGate] Bearer token:", bearer ? "exists" : "missing");

      if (!bearer) {
        console.log("[SubscriptionGate] No bearer token, redirecting to /");
        router.replace("/");
        return;
      }

      // ÖNCELİKLE: Onboarding status kontrolü yap
      console.log("[SubscriptionGate] Checking onboarding status...");
      try {
        const statusRes = await fetch("/api/onboarding/status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${bearer}`,
            "Content-Type": "application/json",
          },
        });

        console.log("[SubscriptionGate] Status response:", statusRes.status);

        if (statusRes.ok) {
          const statusData = await readJson(statusRes);
          console.log("[SubscriptionGate] Full status data:", JSON.stringify(statusData, null, 2));

          // Backend response: { success: true, data: { status: "..." } }
          const userStatus = statusData?.data?.status;

          console.log("[SubscriptionGate] User status:", userStatus);

          // Eğer kullanıcı onboarding sürecindeyse veya ödeme reddedildiyse, oraya yönlendir
          if (
            userStatus === "PASSIVE_NO_PAYMENT" ||
            userStatus === "PENDING_APPROVAL" ||
            userStatus === "REJECTED"
          ) {
            console.log(
              "[SubscriptionGate] User in onboarding/rejected, redirecting to /onboarding/setup-fee"
            );
            router.replace("/onboarding/setup-fee");
            return;
          }

          if (userStatus === "SUSPENDED") {
            console.log("[SubscriptionGate] User suspended, redirecting to /suspended");
            router.replace("/suspended");
            return;
          }

          console.log("[SubscriptionGate] User status is ACTIVE_READY, proceeding to subscription check");
        } else {
          console.error("[SubscriptionGate] Status check failed with status:", statusRes.status);
        }
      } catch (e) {
        console.error("[SubscriptionGate] Onboarding status check failed:", e);
      }

      // Onboarding tamamlandıysa, normal subscription kontrolüne geç
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
