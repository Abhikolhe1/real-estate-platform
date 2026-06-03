'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { paths } from '@/routes/paths';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [builderInfo, setBuilderInfo] = useState({
    name: 'Aethelgard Residences',
    email: 'admin@aethelgard.com',
    logo: 'AETHELGARD',
    primaryColor: '#d4af37',
  });

  useEffect(() => {
    // Dynamically fetch builder theme from backend API
    fetch('http://localhost:3001/builders/theme', {
      headers: {
        'x-tenant-id': 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2', // Seeded Aethelgard builder id placeholder
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.logo) {
          setBuilderInfo({
            name: data.logo === 'AETHELGARD' ? 'Aethelgard Residences' : 'OmniEstate Developers',
            email: data.logo === 'AETHELGARD' ? 'admin@aethelgard.com' : 'admin@omniestate.com',
            logo: data.logo,
            primaryColor: data.primaryColor || '#d4af37',
          });
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { label: 'Dashboard', path: paths.dashboard.root, icon: '📊' },
    { label: 'Projects & Towers', path: paths.dashboard.projects, icon: '🏢' },
    { label: 'Flats Inventory', path: paths.dashboard.flats, icon: '🛏️' },
    { label: 'AI 3D Floor Plans', path: paths.dashboard.aiGenerator, icon: '📐' },
    { label: 'Website CMS', path: paths.dashboard.website, icon: '🖥️' },
    { label: 'CRM Leads', path: paths.dashboard.leads, icon: '👥' },
    { label: 'Media Assets', path: paths.dashboard.media, icon: '📁' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Dynamic Builder Sidebar */}
      <aside className="w-[280px] bg-white border-r border-gray-200 p-6 flex flex-col justify-between fixed h-full z-30">
        <div>
          <div className="mb-8 pl-4">
            <span 
              className="text-xl font-extrabold tracking-wider transition-colors duration-300"
              style={{ color: builderInfo.primaryColor }}
            >
              {builderInfo.logo}
            </span>
            <span className="text-[9px] block text-gray-400 font-bold uppercase tracking-widest mt-1">BUILDER ENGINE</span>
          </div>

          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-center gap-3 pl-2">
          <div 
            className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-300"
            style={{ backgroundColor: builderInfo.primaryColor }}
          >
            {builderInfo.logo.substring(0, 2)}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800 tracking-tight">{builderInfo.name}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{builderInfo.email}</p>
          </div>
        </div>
      </aside>

      {/* Main Panel Offset */}
      <div className="flex-1 pl-[280px] min-h-screen">
        <main className="p-10 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
