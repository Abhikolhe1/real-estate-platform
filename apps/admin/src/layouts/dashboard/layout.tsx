'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
export default function DashboardLayout({children}: {children: React.ReactNode}) {
 const params = useSearchParams(), router = useRouter();
 const activeTab = params.get('tab') || 'overview';
 const [collapsed, setCollapsed] = useState(false), [mobileOpen, setMobileOpen] = useState(false);
 const user = useAuthStore(state => state.user), clearAuth = useAuthStore(state => state.clearAuth);
 useEffect(() => { setMobileOpen(false); }, [activeTab]);
 useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
 const items = [{label:'Overview',tab:'overview',icon:'◫'},{label:'Builders Directory',tab:'builders',icon:'⌂'},{label:'Billing & Subscriptions',tab:'billing',icon:'▤'},{label:'System Settings',tab:'settings',icon:'⚙'}];
 return <div className="min-h-screen bg-slate-900 font-sans text-slate-100">
  <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-4 border-b border-slate-800 bg-slate-950 px-4 md:hidden"><button aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="rounded border border-white/20 px-3 py-1">☰</button><span className="text-sm">Platform administration</span></div>
  {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />}
  <aside aria-label="Administration navigation" className={`fixed inset-y-0 left-0 z-50 w-[260px] flex-col justify-between border-r border-slate-800 bg-slate-950 p-3 ${collapsed ? 'md:w-20' : 'md:w-[260px]'} ${mobileOpen ? 'flex' : 'hidden md:flex'}`}>
   <div><div className="flex h-16 items-center justify-between px-2">{(!collapsed || mobileOpen) && <span className="text-sm font-bold tracking-wide text-indigo-300">AETHER CONTROL</span>}<button className="hidden rounded-lg p-2 text-white/60 hover:bg-white/10 md:block" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '→' : '←'}</button><button className="p-2 md:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>✕</button></div><nav className="mt-5 space-y-2">{items.map(item => <Link key={item.tab} title={item.label} aria-label={item.label} aria-current={activeTab === item.tab ? 'page' : undefined} href={`/?tab=${item.tab}`} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl p-3 text-xs ${activeTab === item.tab ? 'bg-indigo-500/15 text-indigo-300' : 'text-white/55 hover:bg-white/5'}`}><span aria-hidden className="text-lg">{item.icon}</span>{(!collapsed || mobileOpen) && <span>{item.label}</span>}</Link>)}</nav></div>
   <div className="space-y-4 border-t border-slate-800 px-2 pt-5">{(!collapsed || mobileOpen) && <div><p className="text-xs font-medium">{user?.firstName} {user?.lastName}</p><p className="mt-1 break-all text-[11px] text-white/40">{user?.email}</p></div>}<button title="Sign out" onClick={() => { clearAuth(); router.replace('/login'); }} className="w-full rounded-lg border border-white/10 py-2 text-xs text-white/50">Sign out</button></div>
  </aside>
  <main className={`min-w-0 px-4 pb-6 pt-20 md:p-8 ${collapsed ? 'md:ml-20' : 'md:ml-[260px]'}`}><div className="mx-auto max-w-7xl">{children}</div></main>
 </div>;
}
