import { NextResponse } from "next/server";
import { API_BASE } from "@/src/configs/api";

const BACKEND_URL = process.env.AUTH_API ?? `${API_BASE}/Auth/login`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { platform, ...payload } = body;

    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        (data && (data.message || data.error || data.title)) ||
        `Giriş başarısız (HTTP ${res.status})`;
      return NextResponse.json({ ok: false, message }, { status: res.status });
    }

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

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Token bulunamadı." },
        { status: 500 }
      );
    }

    const resp = NextResponse.json(data);

    resp.cookies.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return resp;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Sunucuya bağlanılamadı." },
      { status: 500 }
    );
  }
}
