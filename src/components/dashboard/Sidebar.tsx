"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import type { NavGroup } from "@/src/types/roles";
import {
  ChevronRight,
  Menu,
  X,
  Settings,
  Tag,
  Truck,
  UserCog,
  UtensilsCrossed,
  Store,
  Building2,
  Users,
  FileText,
  Cpu,
  Briefcase,
  Box,
  Megaphone,
} from "lucide-react";
import { useCorporateAccess } from "@/src/hooks/useCorporateAccess";

const ROLE_TITLES: Record<string, string> = {
  admin: "Admin",
  restaurant: "Restoran",
  dealer: "Bayi",
  corporate: "Kurumsal",
  marketing: "Pazarlama",
};

const ICON_MAP: Record<string, React.ElementType> = {
  settings: Settings,
  tag: Tag,
  truck: Truck,
  "users-cog": UserCog,
  "utensils-crossed": UtensilsCrossed,
  store: Store,
  "building-2": Building2,
  users: Users,
  "file-text": FileText,
  cpu: Cpu,
  briefcase: Briefcase,
  box: Box,
  megaphone: Megaphone,
};

export default function Sidebar({ nav = [] as NavGroup[] }: { nav?: NavGroup[] }) {
  const pathname = usePathname();
  const { access, loading: accessLoading } = useCorporateAccess();

  // Mobilde kapalı, masaüstünde açık gelsin (ama kullanıcı isterse masaüstünde de kapatabilsin)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Erişim kontrolüne göre filtrelenmiş navigasyon
  const filteredNav = useMemo(() => {
    // Henüz access yüklenmediyse tüm menüyü göster (loading state)
    if (access === null) return nav;

    return nav
      .filter((group) => {
        // Grup seviyesinde erişim kontrolü
        if (group.requiredAccess && group.requiredAccess.length > 0) {
          return group.requiredAccess.some((id) => access.includes(id));
        }
        return true;
      })
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          // Item seviyesinde erişim kontrolü
          if (item.requiredAccess && item.requiredAccess.length > 0) {
            return item.requiredAccess.some((id) => access.includes(id));
          }
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0); // Boş grupları kaldır
  }, [nav, access]);

  const [open, setOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(nav.map((g) => [g.title, true])) as Record<string, boolean>
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)"); // tailwind lg
    const applyDefault = () => setSidebarOpen(mq.matches);

    applyDefault();
    mq.addEventListener?.("change", applyDefault);

    const onOpen = () => setSidebarOpen(true);
    const onClose = () => setSidebarOpen(false);
    const onToggle = () => setSidebarOpen((s) => !s);

    window.addEventListener("sidebar:open", onOpen as EventListener);
    window.addEventListener("sidebar:close", onClose as EventListener);
    window.addEventListener("sidebar:toggle", onToggle as EventListener);

    return () => {
      mq.removeEventListener?.("change", applyDefault);
      window.removeEventListener("sidebar:open", onOpen as EventListener);
      window.removeEventListener("sidebar:close", onClose as EventListener);
      window.removeEventListener("sidebar:toggle", onToggle as EventListener);
    };
  }, []);

  return (
    <>
      {/* Mobil overlay */}
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Menüyü kapat"
        />
      )}

      {/* Masaüstünde kapalıyken açma düğmesi */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="hidden lg:flex fixed left-4 top-4 z-20 items-center justify-center h-10 w-10 rounded-xl bg-white border border-neutral-200 shadow-sm hover:bg-neutral-50 text-neutral-600"
          aria-label="Menüyü aç"
          title="Menüyü aç"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      <aside
        className={[
          "fixed lg:sticky top-0 left-0 z-40 h-dvh w-72 shrink-0 bg-white border-r border-neutral-200 flex flex-col overflow-hidden",
          "transition-transform duration-200 ease-out will-change-transform",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarOpen ? "lg:flex" : "lg:hidden",
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2 h-8 overflow-visible">
            <img
              src="/Brand/yuksi.png"
              alt="Yüksi"
              className="h-28 w-[120px] object-contain shrink-0 select-none"
              draggable={false}
            />
            <div className="text-lg font-semibold text-orange-600">Kurumsal Üye</div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-neutral-100 text-neutral-500"
              aria-label="Menüyü kapat"
              title="Menüyü kapat"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Scrollable area */}
        <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-neutral-300/60 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-track]:bg-transparent">
          {accessLoading && (
            <div className="px-4 py-2 text-sm text-orange-500 animate-pulse">
              Menü yükleniyor...
            </div>
          )}
          {filteredNav.map((group) => {
            console.log('filteredNav : ', group);
            
            const isOpen = open[group.title] ?? true;
            const Icon = group.icon ? ICON_MAP[group.icon] : null;

            console.log('icon status : ',  Icon);
            
            return (
              <div key={group.title} className="rounded-2xl">
                <button
                  onClick={() => setOpen((s) => ({ ...s, [group.title]: !isOpen }))}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 bg-orange-50 text-orange-700 hover:bg-orange-100 transition"
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-5 w-5" />}
                    <span className="text-sm font-semibold">{group.title}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : "rotate-0"}`} />
                </button>

                <ul className={`${isOpen ? "mt-2" : "hidden"} space-y-2 px-1`}>
                  {group.items.map((it) => {
                    const href = `${it.href}`;
                    const isRootLink = it.href.replace(/^\/+|\/+$/g, "").split("/").length === 1;
                    const active = isRootLink ? pathname === href : pathname === href || pathname.startsWith(href + "/");
                    console.log('MAPPING : ', it);
                    
                    return (
                      <li key={it.href}>
                        <Link
                          href={href}
                          onClick={() => {
                            // Mobilde tıklayınca menüyü kapat
                            if (window.matchMedia("(max-width: 1023px)").matches) setSidebarOpen(false);
                          }}
                          className={[
                            "flex items-center justify-between rounded-xl px-4 py-3 transition",
                            active ? "bg-orange-500 text-white shadow-sm" : "text-orange-600 hover:bg-orange-50",
                          ].join(" ")}
                        >
                          <span className="text-sm font-medium">{it.label}</span>
                          
                          <ChevronRight className={`h-4 w-4 ${active ? "text-white" : "text-orange-500"}`} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
