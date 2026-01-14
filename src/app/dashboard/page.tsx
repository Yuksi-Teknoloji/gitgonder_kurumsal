"use client";

import { redirect } from "next/navigation";
import { getAuthToken } from "@/src/utils/auth";
import { decodeJwt, isExpired, roleSegment } from "@/src/utils/jwt";
import { useEffect, useState } from "react";

export default function CorporateHome() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAuthToken());
  }, []);

  if (token === null) {
    return null;
  }

  const claims = decodeJwt(token);

  if (!claims || isExpired(claims)) {
    redirect("/");
  }

  const role = String(roleSegment(claims.userType) || "").toLowerCase();

  console.log("[Dashboard Page] Role check:", role);

  // TEMPORARY: Backend "business" olarak kaydediyor
  if (role !== "corporate" && role !== "business") {
    console.log("[Dashboard Page] Role mismatch, redirecting to /");
    redirect("/");
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      Kurumsal Üye Paneline Hoşgeldiniz
    </div>
  );
}
