// src/types/userStatus.ts

/**
 * User onboarding and subscription status
 */
export type UserStatus =
  | "PASSIVE_NO_PAYMENT" // Kayıt oldu, giriş bedeli ödemedi
  | "PENDING_APPROVAL" // Dekont yükledi, admin onayı bekliyor
  | "ACTIVE_READY" // Admin onayladı, sistemi kullanabilir
  | "SUBSCRIBED" // Aktif abonelik var
  | "REJECTED" // Ödeme reddedildi, yeniden ödeme yapmalı
  | "SUSPENDED"; // Hesap askıya alındı

export interface UserStatusResponse {
  success: boolean;
  data?: {
    status: UserStatus;
    userId?: string;
    setupFee?: {
      amount: number;
      currency: string;
      paid: boolean;
    };
  };
  message?: string;
}
