'use client';

import { API_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { paths } from '@/routes/paths';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [builderInfo, setBuilderInfo] = useState({
    name: 'Aethelgard Residences',
    email: 'admin@aethelgard.com',
    logo: 'AETHELGARD',
    primaryColor: '#d4af37',
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);

  useEffect(() => {
    if (!token || !user?.tenantId) return;

    // Dynamically fetch builder theme from backend API
    fetch(`${API_URL}/builders/theme`, {
      headers: {
        'x-tenant-id': user.tenantId,
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.logo) {
          setBuilderInfo({
            name: data.companyName || data.logo,
            email: user.email,
            logo: data.logo,
            primaryColor: data.primaryColor || '#d4af37',
          });
        }
      })
      .catch(() => {});
  }, [token, user]);

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', path: paths.dashboard.root, icon: '📊', exact: true },
        { label: 'Analytics', path: paths.dashboard.analytics, icon: '📈', exact: false },
      ],
    },
    {
      label: 'Property Management',
      items: [
        { label: 'Projects', path: paths.dashboard.projects, icon: '🏗️', exact: false },
        { label: 'Towers', path: paths.dashboard.towers, icon: '🏢', exact: false },
        { label: 'Floors', path: paths.dashboard.floors, icon: '🏠', exact: false },
        { label: 'Flats Inventory', path: paths.dashboard.flats, icon: '🛏️', exact: false },
        { label: '3D Walkthroughs', path: paths.dashboard.walkthroughs, icon: '🕶️', exact: false },
      ],
    },
    {
      label: 'Sales & CRM',
      items: [
        { label: 'CRM Leads', path: paths.dashboard.leads, icon: '🤝', exact: false },
        { label: 'Team Members', path: paths.dashboard.team, icon: '👥', exact: false },
      ],
    },
    {
      label: 'Content & Assets',
      items: [
        { label: 'Media Library', path: paths.dashboard.media, icon: '📁', exact: false },
        { label: 'Website CMS', path: paths.dashboard.website, icon: '🖥️', exact: false },
        { label: 'AI Floor Plans', path: paths.dashboard.aiGenerator, icon: '📐', exact: false },
        { label: 'SDK & Integrations', path: paths.dashboard.sdk, icon: '🔌', exact: false },
      ],
    },
  ];

  const isActive = (itemPath: string, exact: boolean) => {
    if (exact) return pathname === itemPath;
    return pathname.startsWith(itemPath) && itemPath !== '/';
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4 md:hidden"><button aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="rounded-lg border px-3 py-2">☰</button><span className="truncate px-3 text-sm font-semibold">{builderInfo.name}</span></div>
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />}
      {/* Dynamic Builder Sidebar */}
      <aside className={`w-[260px] ${sidebarCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'} ${mobileOpen ? 'flex' : 'hidden md:flex'} bg-white border-r border-gray-100 flex-col justify-between fixed h-full z-50 transition-all duration-300 overflow-hidden`}>
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${sidebarCollapsed && !mobileOpen ? 'justify-center' : ''}`}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-sm"
              style={{ backgroundColor: builderInfo.primaryColor }}
            >
              {builderInfo.logo.substring(0, 2)}
            </div>
            {(!sidebarCollapsed || mobileOpen) && (
              <div className="overflow-hidden">
                <p className="text-xs font-extrabold text-gray-900 tracking-tight truncate leading-tight">
                  {builderInfo.name}
                </p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  Builder Engine
                </p>
              </div>
            )}
          </div>

          {/* Scrollable Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                {(!sidebarCollapsed || mobileOpen) && (
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-2 px-3">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.path, item.exact);
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={() => setMobileOpen(false)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all duration-200 group ${
                          active
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                      >
                        <span className="text-base flex-shrink-0">{item.icon}</span>
                        {(!sidebarCollapsed || mobileOpen) && (
                          <span className="text-[13px] truncate">{item.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom User Info + Collapse Toggle */}
          <div className="border-t border-gray-100 p-3 space-y-3">
            {(!sidebarCollapsed || mobileOpen) && (
              <div className="flex items-center gap-3 px-2 py-2">
                <div
                  className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: builderInfo.primaryColor }}
                >
                  {(user?.firstName || builderInfo.logo).substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-gray-800 truncate">{user?.firstName || 'Builder Admin'}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user?.email || builderInfo.email}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex-1 text-center py-2 rounded-lg text-xs font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                title="Toggle sidebar"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!sidebarCollapsed}
              >
                {sidebarCollapsed ? '→' : '←'}
              </button>
              {(!sidebarCollapsed || mobileOpen) && (
                <button
                  onClick={() => { clearAuth(); router.push('/login'); }}
                  className="flex-1 text-center py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Offset */}
      <div className={`min-w-0 flex-1 pt-14 md:pt-0 ${sidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-[260px]'} min-h-screen transition-all duration-300`}>
        <main className="p-4 md:p-8 max-w-7xl mx-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
