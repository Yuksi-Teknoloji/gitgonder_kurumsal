"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ModuleAccessGuard } from "@/src/components/access/ModuleAccessGuard";
import { CORPORATE_MODULES } from "@/src/hooks/useCorporateAccess";

const LogisticsTracking = dynamic(() => import("./LogisticsTracking"), {
  ssr: false,
});

export default function UserListPage() {
  return (
    <ModuleAccessGuard moduleId={CORPORATE_MODULES.YUK_OLUSTUR}>
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <LogisticsTracking />
      </Suspense>
    </ModuleAccessGuard>
  );
}
