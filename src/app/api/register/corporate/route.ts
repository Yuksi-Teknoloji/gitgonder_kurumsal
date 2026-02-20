import { NextResponse } from "next/server";
import { API_BASE } from "@/src/configs/api";

const BACKEND_URL = `${API_BASE}/Auth/register/corporate`;

export async function POST(req: Request) {
  try {
    // Backend'e JSON formatında gönder (FormData değil)
    const body = await req.json();
    const payload = { ...body, platform: "gitgonder" };

    console.log("=== CORPORATE REGISTER REQUEST ===");
    console.log("Backend URL:", BACKEND_URL);
    console.log("Request Body:", JSON.stringify(payload, null, 2));

    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    console.log("=== BACKEND RESPONSE ===");
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
    console.log("========================");

    if (!res.ok) {
      const message =
        data?.message || data?.error || data?.title || `Kayıt başarısız (HTTP ${res.status})`;
      return NextResponse.json(
        { success: false, message },
        { status: res.status }
      );
    }

    // Backend response'u olduğu gibi döndür (double wrap yapma)
    // { userId, companyId, status, accessToken, refreshToken }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("=== REGISTER ERROR ===");
    console.error(err);
    console.error("======================");
    return NextResponse.json(
      { success: false, message: "Sunucuya bağlanılamadı." },
      { status: 500 }
    );
  }
}
