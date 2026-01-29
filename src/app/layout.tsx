import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "@/globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Yuksi Kurumsal",
  description: "Yuksi Kurumsal Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${nunito.className} antialiased`}>{children}</body>
    </html>
  );
}
