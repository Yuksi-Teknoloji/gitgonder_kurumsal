// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type UserStatus =
  | "PASSIVE_NO_PAYMENT"
  | "PENDING_APPROVAL"
  | "ACTIVE_READY"
  | "SUBSCRIBED"
  | "REJECTED"
  | "SUSPENDED";

const BACKEND_URL = "https://www.yuksi.dev/api";

// MOCK MODE: Development/testing için
const MOCK_STATUS_ENABLED = false; // false yapınca gerçek backend'e istek atar
const MOCK_STATUS: UserStatus = "PASSIVE_NO_PAYMENT";

async function getUserStatusFromBackend(
  token: string
): Promise<UserStatus | null> {
  try {
    console.log("[MIDDLEWARE] Fetching status from backend...");

    const res = await fetch(`${BACKEND_URL}/onboarding/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[MIDDLEWARE] Backend status request failed:", res.status);
      return null;
    }

    const data = await res.json();
    console.log("[MIDDLEWARE] Backend status response:", data);

    // Backend response formatı: { success: true, data: { status: "..." } }
    if (data?.success && data?.data?.status) {
      return data.data.status as UserStatus;
    }

    return null;
  } catch (error) {
    console.error("[MIDDLEWARE] Error fetching status:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("[MIDDLEWARE] Request path:", pathname);

  // Public routes - middleware bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    console.log("[MIDDLEWARE] Public route, bypassing");
    return NextResponse.next();
  }

  // Onboarding sayfası için özel kontrol - sonsuz loop'u önle
  if (pathname.startsWith("/onboarding")) {
    console.log("[MIDDLEWARE] Onboarding route, bypassing");
    return NextResponse.next();
  }

  // Suspended sayfası için özel kontrol
  if (pathname.startsWith("/suspended")) {
    console.log("[MIDDLEWARE] Suspended route, bypassing");
    return NextResponse.next();
  }

  // Protected routes için token kontrolü
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    console.log("[MIDDLEWARE] No token found, redirecting to /");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // User status kontrolü
  let userStatus: UserStatus | null = null;

  if (MOCK_STATUS_ENABLED) {
    // Mock mode - development için
    userStatus = MOCK_STATUS;
    console.log("[MIDDLEWARE] Mock mode enabled, status:", userStatus);
  } else {
    // Backend'den status al
    userStatus = await getUserStatusFromBackend(token);
    console.log("[MIDDLEWARE] Backend status:", userStatus);
  }

  if (!userStatus) {
    console.log("[MIDDLEWARE] No status found, redirecting to /");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // SUSPENDED durumunda suspended sayfasına yönlendir
  if (userStatus === "SUSPENDED") {
    if (!pathname.startsWith("/suspended")) {
      console.log("[MIDDLEWARE] User suspended, redirecting to /suspended");
      return NextResponse.redirect(new URL("/suspended", request.url));
    }
    return NextResponse.next();
  }

  // Status'e göre yönlendirme mantığı
  if (
    userStatus === "PASSIVE_NO_PAYMENT" ||
    userStatus === "PENDING_APPROVAL" ||
    userStatus === "REJECTED"
  ) {
    console.log(
      "[MIDDLEWARE] User needs setup fee/approval/re-payment, checking if protected path..."
    );
    // Kullanıcı setup fee ödemedi, onay bekliyor veya ödeme reddedildi
    // Dashboard'a veya korumalı rotalara erişemez
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/packages")) {
      console.log("[MIDDLEWARE] Redirecting to /onboarding/setup-fee");
      return NextResponse.redirect(
        new URL("/onboarding/setup-fee", request.url)
      );
    }
  }

  // ACTIVE_READY ve SUBSCRIBED - tüm sayfalara erişebilir
  if (userStatus === "ACTIVE_READY" || userStatus === "SUBSCRIBED") {
    console.log("[MIDDLEWARE] User is active/subscribed, allowing access");
    return NextResponse.next();
  }

  // Fallback: Diğer durumlar için de erişim ver (gelecekte eklenebilecek durumlar için)
  return NextResponse.next();
}

// Middleware'in hangi path'lerde çalışacağını belirle
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
