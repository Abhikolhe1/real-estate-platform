'use client';

import React from 'react';
import { paths } from '@/routes/paths';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Dynamic Navigation Sidebar */}
      <aside className="w-[280px] bg-white border-r border-gray-200 p-6 flex flex-col justify-between">
        <div>
          <div className="mb-8 pl-4">
            <span className="text-xl font-extrabold bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">AETHER SUPER</span>
            <span className="text-[10px] block text-gray-500 font-bold uppercase tracking-widest mt-1">SAAS PLATFORM GOVERNANCE</span>
          </div>

          <nav className="flex flex-col gap-2">
            <a href={paths.dashboard.root} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-violet-50 text-violet-700 font-semibold transition-all">
              <span>📊</span>
              <span>Overview</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium transition-all">
              <span>🏢</span>
              <span>Builders Directory</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium transition-all">
              <span>💳</span>
              <span>Billing & Subscriptions</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium transition-all">
              <span>👥</span>
              <span>Global Accounts</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium transition-all">
              <span>⚙️</span>
              <span>System Settings</span>
            </a>
          </nav>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 text-white flex items-center justify-center font-bold">SA</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Super Admin</p>
            <p className="text-xs text-gray-400">root@aetherplatform.io</p>
          </div>
        </div>
      </aside>

      {/* Primary Dashboard Panel */}
      <main className="flex-1 overflow-y-auto p-10">
        {children}
      </main>
    </div>
  );
}
