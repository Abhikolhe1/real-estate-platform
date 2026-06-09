import './globals.css';
import React, { Suspense } from 'react';

export const metadata = {
  title: 'Aether Platform Admin | Enterprise Multi-Tenant SaaS Platform',
  description: 'Enterprise governance dashboard for SaaS billing, storage metrics, and tenant builder registry.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 font-sans antialiased">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading Platform...</p>
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </body>
    </html>
  );
}

