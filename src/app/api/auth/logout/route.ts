import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });

  // Cookie'yi sil - expire et
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0, // Hemen expire et
  });

  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  console.log("=== LOGOUT ===");
  console.log("Cookies cleared");
  console.log("==============");

  return response;
}

export async function DELETE() {
  return POST();
}
