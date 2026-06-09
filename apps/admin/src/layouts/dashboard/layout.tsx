'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { paths } from '@/routes/paths';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const navItems = [
    { label: 'Overview', value: 'overview', icon: '📊', path: '/?tab=overview' },
    { label: 'Builders Directory', value: 'builders', icon: '🏢', path: '/?tab=builders' },
    { label: 'Billing & Subscriptions', value: 'billing', icon: '💳', path: '/?tab=billing' },
    { label: 'System Settings', value: 'settings', icon: '⚙️', path: '/?tab=settings' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Dynamic Navigation Sidebar */}
      <aside className="w-[280px] bg-slate-950 border-r border-slate-900 p-6 flex flex-col justify-between fixed h-full z-30">
        <div>
          {/* Platform Branding */}
          <div className="mb-10 pl-2">
            <span className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
              AETHER SUPER
            </span>
            <span className="text-[9px] block text-slate-500 font-bold uppercase tracking-widest mt-1">
              SAAS PLATFORM GOVERNANCE
            </span>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.value;
              return (
                <Link
                  key={item.value}
                  href={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-xs tracking-wide transition-all duration-300 border ${
                    isActive
                      ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-lg shadow-indigo-500/5'
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-100 border-transparent'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Super Admin Identity */}
        <div className="border-t border-slate-900 pt-6 flex items-center gap-3.5 pl-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/10">
            SA
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200 tracking-tight">Super Admin</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">root@aetherplatform.io</p>
          </div>
        </div>
      </aside>

      {/* Primary Dashboard Panel */}
      <main className="flex-1 pl-[280px] bg-slate-900 min-h-screen">
        <div className="p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
