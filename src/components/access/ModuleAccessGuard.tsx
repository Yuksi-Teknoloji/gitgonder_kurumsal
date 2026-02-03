"use client";
import { useCorporateAccess, CORPORATE_MODULES } from "@/src/hooks/useCorporateAccess";

type ModuleAccessGuardProps = {
  moduleId: number | number[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

const MODULE_NAMES: Record<number, string> = {
  [CORPORATE_MODULES.YUK_OLUSTUR]: "Yük Oluştur",
  [CORPORATE_MODULES.TICARI]: "Ticari",
  [CORPORATE_MODULES.YUKSI_KARGO]: "Yüksi Kargo",
};

function getModuleName(moduleId: number | number[]): string {
  if (Array.isArray(moduleId)) {
    return moduleId.map((id) => MODULE_NAMES[id] || `Modül ${id}`).join(" veya ");
  }
  return MODULE_NAMES[moduleId] || `Modül ${moduleId}`;
}

/**
 * Sayfa seviyesinde modül erişim kontrolü sağlar.
 * Kullanıcının belirtilen modüle erişimi yoksa uyarı mesajı gösterir.
 *
 * @example
 * <ModuleAccessGuard moduleId={CORPORATE_MODULES.YUKSI_KARGO}>
 *   <CargoPage />
 * </ModuleAccessGuard>
 */
export function ModuleAccessGuard({
  moduleId,
  children,
  fallback,
}: ModuleAccessGuardProps) {
  const { access, loading, hasAccess } = useCorporateAccess();

  // Yükleniyor
  if (loading || access === null) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow animate-pulse">
        <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
        <div className="mt-4 h-4 bg-neutral-100 rounded w-2/3"></div>
      </div>
    );
  }

  // Erişim yok
  if (!hasAccess(moduleId)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100">
            <svg
              className="w-5 h-5 text-rose-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-800">
            Erişim Yetkisi Gerekli
          </h2>
        </div>
        <p className="text-sm text-neutral-600">
          Bu sayfayı görüntülemek için{" "}
          <strong className="text-rose-600">{getModuleName(moduleId)}</strong>{" "}
          modülüne erişim yetkiniz olması gerekiyor.
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          Yetki almak için sistem yöneticinize başvurun.
        </p>
      </div>
    );
  }

  // Erişim var
  return <>{children}</>;
}

export default ModuleAccessGuard;
