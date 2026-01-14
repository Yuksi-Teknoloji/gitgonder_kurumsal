import { NextResponse } from "next/server";
import { API_BASE } from "@/src/configs/api";

const BACKEND_URL = `${API_BASE}/bank-accounts`;

export async function GET() {
  try {
    console.log("=== GET BANK ACCOUNTS ===");
    console.log("Backend URL:", BACKEND_URL);
    console.log("API_BASE:", API_BASE);
    console.log("Timestamp:", new Date().toISOString());

    const res = await fetch(BACKEND_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const rawText = await res.text();
    console.log("=== RAW RESPONSE TEXT ===");
    console.log("Raw Text Length:", rawText.length);
    console.log("Raw Text:", rawText.substring(0, 500));
    console.log("=========================");

    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (parseError) {
      console.error("=== JSON PARSE ERROR ===");
      console.error("Parse Error:", parseError);
      console.error("Raw Text:", rawText);
      console.error("========================");
    }

    console.log("=== BACKEND RESPONSE ===");
    console.log("Status:", res.status);
    console.log("Status Text:", res.statusText);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    console.log("Response Type:", Array.isArray(data) ? "Array" : typeof data);
    console.log("Response Length:", Array.isArray(data) ? data.length : "N/A");
    console.log("Full Response:", JSON.stringify(data, null, 2));

    if (Array.isArray(data)) {
      console.log("=== BANK ACCOUNTS DETAILS ===");
      data.forEach((account, index) => {
        console.log(`Account ${index + 1}:`, {
          id: account?.id,
          bank_name: account?.bank_name,
          account_holder: account?.account_holder,
          iban: account?.iban,
          branch_name: account?.branch_name,
          account_number: account?.account_number,
          corporate_activation_price: account?.corporate_activation_price,
        });
      });
      console.log("=============================");
    } else if (data?.data && Array.isArray(data.data)) {
      console.log("=== BANK ACCOUNTS DETAILS (nested) ===");
      data.data.forEach((account: any, index: number) => {
        console.log(`Account ${index + 1}:`, {
          id: account?.id,
          bank_name: account?.bank_name,
          account_holder: account?.account_holder,
          iban: account?.iban,
          branch_name: account?.branch_name,
          account_number: account?.account_number,
          corporate_activation_price: account?.corporate_activation_price,
        });
      });
      console.log("=====================================");
    }

    console.log("========================");

    if (!res.ok) {
      const message =
        data?.message ||
        data?.error ||
        data?.title ||
        `Banka hesap bilgileri alınamadı (HTTP ${res.status})`;
      return NextResponse.json(
        { success: false, message },
        { status: res.status }
      );
    }

    // Backend response'u olduğu gibi döndür
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("=== BANK ACCOUNTS ERROR ===");
    console.error(err);
    console.error("===========================");
    return NextResponse.json(
      { success: false, message: "Sunucuya bağlanılamadı." },
      { status: 500 }
    );
  }
}
