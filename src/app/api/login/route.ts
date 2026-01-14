import { NextResponse } from "next/server";
import { API_BASE } from "@/src/configs/api";

// Production'da environment variable set edilmeli, yoksa API_BASE kullanılır
const BACKEND_URL = process.env.AUTH_API ?? `${API_BASE}/Auth/login`;

export async function POST(req: Request) {
  try {
    const body = await req.json(); // { email, password }

    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    console.log("=== LOGIN API ROUTE ===");
    console.log("Backend URL:", BACKEND_URL);
    console.log("Backend Status:", res.status);
    console.log("Backend Response:", JSON.stringify(data, null, 2));

    if (!res.ok) {
      // Backend'in döndürdüğü hata mesajını yüzeye çıkar
      const message =
        (data && (data.message || data.error || data.title)) ||
        `Giriş başarısız (HTTP ${res.status})`;
      return NextResponse.json({ ok: false, message }, { status: res.status });
    }

    // Token alanı backend'e göre değişebilir - extractToken fonksiyonuyla aynı mantık
    const token =
      data?.token ||
      data?.access_token ||
      data?.accessToken ||
      data?.jwt ||
      data?.data?.accessToken ||
      data?.data?.token ||
      data?.result?.accessToken ||
      data?.result?.token ||
      null;

    console.log(
      "Extracted Token:",
      token ? token.substring(0, 20) + "..." : "NOT FOUND"
    );
    console.log("Token fields checked:", {
      "data.token": !!data?.token,
      "data.access_token": !!data?.access_token,
      "data.accessToken": !!data?.accessToken,
      "data.jwt": !!data?.jwt,
      "data.data.accessToken": !!data?.data?.accessToken,
      "data.data.token": !!data?.data?.token,
      "data.result.accessToken": !!data?.result?.accessToken,
      "data.result.token": !!data?.result?.token,
    });

    if (!token) {
      console.error("=== TOKEN NOT FOUND ===");
      console.error("Full response data:", JSON.stringify(data, null, 2));
      return NextResponse.json(
        { ok: false, message: "Token bulunamadı." },
        { status: 500 }
      );
    }

    // Backend response'unu olduğu gibi forward et (ana sayfadaki extractToken ve role kontrolü için)
    // Cookie'yi de set et
    const resp = NextResponse.json(data);

    const isProduction = process.env.NODE_ENV === "production";

    console.log("=== SETTING COOKIE ===");
    console.log("Cookie will be set with token");
    console.log("Is Production:", isProduction);
    console.log("Secure:", isProduction);
    console.log("======================");

    // 7 gün geçerli, HTTP-only cookie
    resp.cookies.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return resp;
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: "Sunucuya bağlanılamadı." },
      { status: 500 }
    );
  }
}
