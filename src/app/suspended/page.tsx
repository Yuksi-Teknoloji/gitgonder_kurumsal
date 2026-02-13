// src/app/suspended/page.tsx
"use client";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-red-200 p-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
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
          <h1 className="mt-6 text-2xl font-bold text-neutral-900">
            Hesabınız Askıya Alındı
          </h1>
          <p className="mt-3 text-neutral-600">
            Hesabınız yönetici tarafından askıya alınmıştır. Lütfen destek ekibimizle iletişime geçin.
          </p>

          <div className="mt-8 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-700 font-semibold mb-2">
              İletişim Bilgileri
            </p>
            <p className="text-sm text-neutral-600">
              E-posta: <a href="mailto:destek@gitgonder.com" className="text-[#032e97] hover:underline">destek@gitgonder.com</a>
            </p>
            <p className="text-sm text-neutral-600">
              Telefon: <a href="tel:+908501234567" className="text-[#032e97] hover:underline">0850 123 45 67</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
