//src/app/config/nav.ts
import type { Role } from "@/src/types/roles";
import type { NavGroup as SidebarNavGroup } from "@/src/types/roles";

// path tabanlı tanım
export type RawNavItem = {
  label: string;
  path: string;
  requiredAccess?: number[]; // Modül erişim ID'leri
};
export type RawNavGroup = {
  title: string;
  items: RawNavItem[];
  requiredAccess?: number[]; // Grup seviyesinde erişim kontrolü
  icon?: string;
};

// Proje dosya yapına göre path’ler:
// - admin sayfaları: /dashboards/[role]/admin/...
// - restaurant sayfaları: /dashboards/[role]/restaurants/...
export const NAV: Record<Role, RawNavGroup[]> = {
  admin: [
    {
      title: "Ayarlar",
      icon: "settings",
      items: [
        { label: "Ana", path: "dashboard" },
        { label: "Genel Ayarlar", path: "dashboard/settings" },
        { label: "Admin Ekle", path: "dashboard/add-admin" },
        { label: "Kullanıcı Mailleri", path: "dashboard/user-emails" },
        { label: "Restoran Talepleri", path: "dashboard/restaurant-request" },
        { label: "Şehir Fiyatları", path: "dashboard/city-prices" },
        { label: "Grafikler", path: "dashboard/charts" },
      ],
    },
    {
      title: "Fiyatlandırmalar",
      icon: "tag",
      items: [
        {
          label: "Restoran Fiyatlandırma",
          path: "dashboard/pricing/restaurant-packages",
        },
        {
          label: "Kurye Fiyatlandırma",
          path: "dashboard/pricing/courier-packages",
        },
      ],
    },
    {
      title: "Nakliyeler",
      icon: "truck",
      items: [
        { label: "Lojistik Takip", path: "dashboard/shipments/shipping-list" },
        {
          label: "Restoran Yük Takip",
          path: "dashboard/shipments/restaurant-shipping-list",
        },
      ],
    },
    {
      title: "Taşıyıcılar",
      icon: "users-cog",
      items: [
        { label: "Taşıyıcı Listesi", path: "dashboard/carriers/carrier-list" },
        { label: "Yük Oluştur", path: "dashboard/carriers/create-load" },
        { label: "Haritalar", path: "dashboard/carriers/maps" },
      ],
    },
    {
      title: "Restoranlar",
      icon: "utensils-crossed",
      items: [
        {
          label: "Restoran Listesi",
          path: "dashboard/restaurants/restaurant-list",
        },
        {
          label: "Restoran Oluştur",
          path: "dashboard/restaurants/create-restaurant",
        },
      ],
    },
    {
      title: "Bayiler",
      icon: "store",
      items: [
        { label: "Bayi Listesi", path: "dashboard/dealers/dealer-list" },
        { label: "Bayi Oluştur", path: "dashboard/dealers/create-dealer" },
      ],
    },
    {
      title: "Şirketler",
      icon: "building-2",
      items: [
        { label: "Şirket Oluştur", path: "dashboard/companies/create-company" },
        { label: "Şirket Listesi", path: "dashboard/companies/company-list" },
        {
          label: "Yetkili Kişiler",
          path: "dashboard/companies/authorized-person",
        }, // kök sayfanız buysa böyle bırakın
      ],
    },
    {
      title: "Kullanıcılar",
      icon: "users",
      items: [{ label: "Kullanıcı Listesi", path: "dashboard/user-list" }],
    },
    {
      title: "İçerikler",
      icon: "file-text",
      items: [
        { label: "Sayfa Listesi", path: "dashboard/contents/page-list" },
        {
          label: "Web Site Referansları",
          path: "dashboard/contents/referances",
        },
      ],
    },
    {
      title: "Sistem",
      icon: "cpu",
      items: [
        { label: "Taşıyıcı Tipleri", path: "dashboard/system/carrier-types" },
        { label: "Araç Tipleri", path: "dashboard/system/vehicle-types" },
        { label: "Yük Tipleri", path: "dashboard/system/load-types" },
        { label: "Ek Fiyatlar", path: "dashboard/system/additional-costs" },
        {
          label: "Ödeme Durumları",
          path: "dashboard/system/transport-packages",
        },
        { label: "Km Fiyatları", path: "dashboard/system/km-prices" },
        { label: "Kampanya Kodları", path: "dashboard/system/add-campaign" },
        {
          label: "Bildirim Gönder",
          path: "dashboard/system/send-notification",
        },
      ],
    },
  ],

  dealer: [
    {
      title: "Bayi",
      icon: "store",
      items: [
        { label: "Ana", path: "dashboard" },
        { label: "Siparişler", path: "dashboard/transportations" },
        { label: "Lojistik Takip", path: "dashboard/logistics-tracking" },
        { label: "Canlı Takip", path: "dashboard/follow-live" },
        { label: "Taşıyıcı Takip", path: "dashboard/carrier-list" },
        { label: "Yük Oluştur", path: "dashboard/create-load" },
        { label: "Grafikler", path: "dashboard/charts" },
        { label: "Haritalar", path: "dashboard/maps" },
        { label: "İşletme Oluştur", path: "dashboard/create-management" },
        { label: "Restoran Listesi", path: "dashboard/restaurant-list" },
        { label: "Fatura ve Ödemeler", path: "dashboard/invoices" },
        { label: "Şirket Listesi", path: "dashboard/company-list" },
      ],
    },
  ],

  corporate: [
    {
      title: "Gitgönder",
      icon: "briefcase",
      items: [
        { label: "Ana", path: "dashboard" },
        { label: "Lojistik Takip", path: "dashboard/logistics-tracking", requiredAccess: [1] },
        { label: "Yük Oluştur", path: "dashboard/create-load", requiredAccess: [1] },
        { label: "Ticarim", path: "dashboard/commercial", requiredAccess: [2] },
        { label: "Grafikler", path: "dashboard/charts" },
      ],
    },
    {
      title: "Gitgönder-Kargo",
      icon: "box",
      requiredAccess: [3], // Grup seviyesinde kontrol - sadece access 3 varsa göster
      items: [
        { label: "Ana Sayfa", path: "dashboard/auto-cargo/home", requiredAccess: [3] },
        { label: "Kargo Oluştur", path: "dashboard/auto-cargo/create-cargo", requiredAccess: [3] },
        { label: "Kargo Ücretleri", path: "dashboard/auto-cargo/cargo-prices", requiredAccess: [3] },
        { label: "Kargolarım", path: "dashboard/auto-cargo/cargo-list", requiredAccess: [3] },
        { label: "Kargo Paketi Ekle", path: "dashboard/auto-cargo/cargo-package", requiredAccess: [3] },
        { label: "Konumum", path: "dashboard/auto-cargo/my-location", requiredAccess: [3] },
      ],
    },
  ],

  marketing: [
    {
      title: "Pazarlama",
      icon: "megaphone",
      items: [{ label: "Ana", path: "marketing" }],
    },
  ],

  restaurant: [
    {
      title: "Restoran",
      icon: "utensils-crossed",
      items: [
        { label: "Ana", path: "dashboard" },
        { label: "Profil Yönetimi", path: "dashboard/profile" },
        { label: "Canlı Takip", path: "dashboard/follow-live" },
        { label: "Paket Satın Al", path: "dashboard/buy-package" },
        { label: "Kalan Paketlerim", path: "dashboard/list-package" },
        { label: "Yük Oluştur", path: "dashboard/create-load" },
        { label: "Yük Listesi", path: "dashboard/list-load" },
        { label: "Grafikler", path: "dashboard/charts" },
        {
          label: "Kurye Puanlamaları",
          path: "dashboard/courier/courier-ratings",
        },
        { label: "Kurye Ekle", path: "dashboard/courier/add-courier" },
        {
          label: "Siparişe Kurye Ata",
          path: "dashboard/courier/list-courier",
        },
        { label: "Sipariş Oluştur", path: "dashboard/create-order" },
        { label: "Sipariş Geçmişi", path: "dashboard/order-history" },
        { label: "Menü", path: "dashboard/menu" },
        { label: "Destek", path: "dashboard/supports" },
        { label: "Fatura ve Ödemeler", path: "dashboard/invoices" },
        { label: "Bildirimler", path: "dashboard/notifications" },
        { label: "Sık Sorulan Sorular(SSS)", path: "dashboard/questions" },
      ],
    },
  ],
};

/** Sidebar için href'e çevir: path -> `/${path}`  */
export function navForRole(role: Role): SidebarNavGroup[] | undefined {
  const raw = NAV[role];
  if (!raw) return undefined;

  return raw.map((g) => ({
    title: g.title,
    icon: g.icon,
    requiredAccess: g.requiredAccess, // Grup seviyesinde erişim kontrolü
    items: g.items.map((it) => ({
      label: it.label,
      // Sidebar zaten `/dashboards/${role}${href}` yapıyor.
      // Bu yüzden href burada `/admin/...` veya `/restaurants/...` şeklinde olmalı.
      href: "/" + it.path.replace(/^\/+/, ""),
      requiredAccess: it.requiredAccess, // Item seviyesinde erişim kontrolü
    })),
  }));
}
