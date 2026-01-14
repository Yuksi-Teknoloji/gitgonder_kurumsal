import { NextResponse } from "next/server";
import { API_BASE } from "@/src/configs/api";

const BACKEND_URL = `${API_BASE}/onboarding/status`;

// MOCK MODE: Development/testing için - REJECTED durumunu test etmek için
const MOCK_STATUS_ENABLED = false; // false yapınca gerçek backend'e istek atar
const MOCK_STATUS = "PASSIVE_NO_PAYMENT"; // PASSIVE_NO_PAYMENT | PENDING_APPROVAL | ACTIVE_READY | SUBSCRIBED | REJECTED | SUSPENDED

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token bulunamadı." },
        { status: 401 }
      );
    }

    // Mock mode aktifse, mock status döndür
    if (MOCK_STATUS_ENABLED) {
      console.log("=== MOCK STATUS MODE ===");
      console.log("Mock Status:", MOCK_STATUS);
      console.log("=======================");
      return NextResponse.json({
        success: true,
        message: "OK",
        data: {
          status: MOCK_STATUS,
        },
      });
    }

    console.log("=== GET ONBOARDING STATUS ===");
    console.log("Backend URL:", BACKEND_URL);
    console.log("Authorization:", authHeader.substring(0, 30) + "...");

    const res = await fetch(BACKEND_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    });

    const data = await res.json().catch(() => ({}));

    console.log("=== BACKEND RESPONSE ===");
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
    console.log("========================");

    if (!res.ok) {
      const message =
        data?.message ||
        data?.error ||
        data?.title ||
        `Status alınamadı (HTTP ${res.status})`;
      return NextResponse.json(
        { success: false, message },
        { status: res.status }
      );
    }

    // Backend response'u olduğu gibi döndür (double wrap yapma)
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("=== STATUS ERROR ===");
    console.error(err);
    console.error("====================");
    return NextResponse.json(
      { success: false, message: "Sunucuya bağlanılamadı." },
      { status: 500 }
    );
  }
}
