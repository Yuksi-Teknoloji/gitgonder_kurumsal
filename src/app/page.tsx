// src/components/auth/AdminLoginForm.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  decodeJwt,
  isExpired,
  roleSegment,
  type JwtClaims,
} from "@/src/utils/jwt";

function extractToken(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    if (raw.split(".").length === 3) return raw;
    try {
      return extractToken(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  return (
    raw.token ||
    raw.access_token ||
    raw.accessToken ||
    raw.jwt ||
    raw?.data?.accessToken ||
    raw?.data?.token ||
    raw?.result?.accessToken ||
    raw?.result?.token ||
    null
  );
}

async function persistToken(token: string, exp?: number) {
  try {
    localStorage.setItem("auth_token", token);
  } catch {}

  await fetch("/api/auth/set-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, exp }),
  }).catch(() => {});
}

export default function CorporateLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = rawText;
      }

      console.log("=== LOGIN RESPONSE ===");
      console.log("Status:", res.status);
      console.log("Data:", JSON.stringify(data, null, 2));
      console.log("====================");

      if (!res.ok) {
        const msg =
          (typeof data === "object" && (data?.message || data?.error)) ||
          "Giriş başarısız.";
        setErr(msg);
        return;
      }

      console.log("=== EXTRACTING TOKEN ===");
      const token = extractToken(data);
      console.log(
        "Extracted token:",
        token ? token.substring(0, 20) + "..." : "NOT FOUND"
      );

      if (!token) {
        console.error("Token extraction failed");
        setErr("Giriş yapılamadı.");
        return;
      }

      console.log("=== DECODING JWT ===");
      const claims = decodeJwt<JwtClaims>(token);
      console.log("Claims:", claims);

      if (!claims) {
        console.error("JWT decode failed");
        setErr("Token çözümlenemedi.");
        return;
      }

      if (isExpired(claims)) {
        console.error("Token expired");
        setErr("Oturum süresi dolmuş.");
        return;
      }

      console.log("=== CHECKING ROLE ===");
      let userRole = String(roleSegment(claims.userType) || "")
        .toLowerCase()
        .trim();
      console.log("Role from userType:", userRole);

      if (!userRole) {
        const firstRole = Array.isArray(data?.data?.roles)
          ? data.data.roles[0]
          : undefined;
        userRole = firstRole?.toLowerCase().trim();
        console.log("Role from data.data.roles:", userRole);
      }

      if (!userRole) {
        const anyClaimRole =
          (claims as any).role ||
          (claims as any)[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];
        userRole = anyClaimRole?.toLowerCase().trim();
        console.log("Role from claims.role:", userRole);
      }

      console.log("Final userRole:", userRole);

      // TEMPORARY: Backend şu an "business" olarak kaydediyor, düzeltilene kadar ikisini de kabul et
      if (userRole !== "corporate" && userRole !== "business") {
        console.error("Invalid role:", userRole);
        setErr("Bu panele sadece kurumsal üyeler erişebilir.");
        return;
      }

      console.log("=== PERSISTING TOKEN ===");
      // /api/login zaten cookie set ediyor, sadece localStorage'a yaz
      try {
        localStorage.setItem("auth_token", token);
        console.log("Token saved to localStorage");
      } catch (e) {
        console.error("Failed to save token to localStorage:", e);
      }

      // persistToken'ı çağırma çünkü /api/login zaten cookie set ediyor
      // await persistToken(token, claims.exp);

      const refreshToken =
        data?.refreshToken ||
        data?.data?.refreshToken ||
        data?.result?.refreshToken;

      if (refreshToken) {
        try {
          localStorage.setItem("refresh_token", refreshToken);
          console.log("Refresh token saved to localStorage");
        } catch (e) {
          console.error("Failed to save refresh token:", e);
        }
        // istersen cookie de yazabilirsin
        document.cookie = `refresh_token=${encodeURIComponent(
          refreshToken
        )}; Path=/; SameSite=Lax`;
      }

      console.log("=== REDIRECTING TO DASHBOARD ===");
      // Cookie'nin set edilmesi için kısa bir delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Middleware status kontrolünü yapacak, biz sadece dashboard'a yönlendir
      try {
        router.replace("/dashboard");
        console.log("Redirect called successfully");
        // Redirect'ten sonra return et ki kod devam etmesin
        return;
      } catch (e) {
        console.error("Redirect error:", e);
        // Fallback: window.location kullan
        window.location.href = "/dashboard";
      }
    } catch {
      setErr("Ağ hatası. Tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-orange-200">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-orange-600">
            Kurumsal Üye Paneli
          </h1>
          <p className="text-gray-600 mt-2">Kurumsal Üye giriş ekranı</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {err && (
            <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-gray-700"
              placeholder="corporate@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-gray-700"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 transition disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor..." : "Kurumsal Üye Giriş"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Henüz hesabınız yok mu?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="text-orange-600 hover:underline font-semibold"
            >
              Kayıt Ol
            </button>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Bu panel sadece kurumsal üyeler içindir.
          </p>
        </div>
      </div>
    </div>
  );
}
