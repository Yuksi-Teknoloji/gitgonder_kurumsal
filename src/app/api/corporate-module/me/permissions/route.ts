import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/src/configs/api";

/**
 * GET /api/corporate-module/me/permissions
 *
 * Kurumsal kullanıcının modül erişim yetkilerini döndürür.
 * Backend endpoint: GET /api/corporate-module/me/permissions
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { success: false, message: "Authorization header eksik", data: null },
      { status: 401 }
    );
  }

  try {

    const upstreamUrl = `${API_BASE}/corporate-module/me/permissions`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await upstreamRes.json();

    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (error) {
    console.error("Corporate permissions proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Erişim bilgisi alınamadı",
        data: null
      },
      { status: 500 }
    );
  }
}
