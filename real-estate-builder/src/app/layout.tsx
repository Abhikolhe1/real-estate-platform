import './globals.css';
import React, { Suspense } from 'react';

export const metadata = {
  title: 'Aether Builder Dashboard | Premium Property SaaS Management',
  description: 'Manage real estate towers, projects, flats, virtual experiences, dynamic custom pages, and CRM leads.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-gray-950 text-slate-100">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
              <p className="text-xs font-bold text-gray-500 tracking-wider uppercase">Loading Workspace Layout...</p>
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </body>
    </html>
  );
}

