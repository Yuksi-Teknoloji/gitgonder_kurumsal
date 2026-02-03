"use client";
import { useEffect, useState } from "react";
/**
 * Corporate modül erişim ID'leri:
 * 1 = Yük Oluştur
 * 2 = Ticari (Ticarim)
 * 3 = Yüksi Kargo
 */
export const CORPORATE_MODULES = {
  YUK_OLUSTUR: 1,
  TICARI: 2,
  YUKSI_KARGO: 3,
} as const;

export type CorporateModuleId = (typeof CORPORATE_MODULES)[keyof typeof CORPORATE_MODULES];

type CorporatePermissionsResponse = {
  success?: boolean;
  message?: string;
  data?: {
    id?: string;
    access: number[];
    access_names?: string[];
  } | null;
};

type UseCorporateAccessReturn = {
  access: number[] | null; // null = henüz yüklenmedi
  accessNames: string[] | null;
  loading: boolean;
  error: string | null;
  hasAccess: (moduleId: number | number[]) => boolean;
  refetch: () => void;
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;

  // Cookie'den al
  const cookies = document.cookie.split(";");
  for (const c of cookies) {
    const [key, val] = c.trim().split("=");
    if (key === "auth_token" && val) return val;
  }

  // localStorage'dan al (fallback)
  return localStorage.getItem("auth_token");
}

function safeJsonParse<T = unknown>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/**
 * İleride token içine `access` claim'i eklenirse (örn: number[]),
 * backend'e gitmeden direkt buradan okuyabiliriz.
 */
function getAccessFromJwt(token: string): number[] | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadB64.padEnd(Math.ceil(payloadB64.length / 4) * 4, "=");
    const jsonStr = atob(padded);
    const payload = safeJsonParse<any>(jsonStr);
    const access = payload?.access;
    if (Array.isArray(access) && access.every((x: any) => Number.isFinite(Number(x)))) {
      return access.map((x: any) => Number(x));
    }
    return null;
  } catch {
    return null;
  }
}

export function useCorporateAccess(): UseCorporateAccessReturn {
  const [access, setAccess] = useState<number[] | null>(null);
  const [accessNames, setAccessNames] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    async function fetchAccess() {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setAccess([]);
        setLoading(false);
        setError("Token bulunamadı");
        return;
      }

      try {
        // 1) Token içinde access claim'i varsa direkt kullan
        const jwtAccess = getAccessFromJwt(token);
        if (jwtAccess) {
          setAccess(jwtAccess);
          setAccessNames(null);
          setLoading(false);
          return;
        }

        // 2) Yoksa, Next.js API proxy route'u üzerinden çek
        // Not: Bu route upstream'e Authorization header'ını aynen forward eder.
        const res = await fetch(`/api/corporate-module/me/permissions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        // Backend'de /me/permissions endpoint'i henüz yoksa 404 dönebilir.
        // Bu durumda hata fırlatmadan, erişimi boş liste olarak kabul ediyoruz.
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json: CorporatePermissionsResponse = await res.json();

        if (cancelled) return;

        if (json.success && json.data?.access) {
          setAccess(json.data.access);
          setAccessNames(json.data.access_names ?? null);
        } else {
          // Backend'den access gelmezse boş array
          setAccess([]);
          setAccessNames(null);
          if (json.message) {
            setError(json.message);
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Corporate access fetch error:", err);
        setError(err instanceof Error ? err.message : "Erişim bilgisi alınamadı");
        setAccess([]);
        setAccessNames(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAccess();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  /**
   * Belirtilen modül ID'sine erişim var mı kontrol eder
   * @param moduleId Tek bir ID veya ID dizisi (any match)
   */
  const hasAccess = (moduleId: number | number[]): boolean => {
    if (access === null) return false;

    if (Array.isArray(moduleId)) {
      return moduleId.some((id) => access.includes(id));
    }
    return access.includes(moduleId);
  };

  return { access, accessNames, loading, error, hasAccess, refetch };
}

export default useCorporateAccess;
