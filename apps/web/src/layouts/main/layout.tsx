'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { builderUrl, getBuilder, publicJson } from '@/lib/public-data';
import { PageSkeleton } from '@/components/page-skeleton';

const navigation = [
  { path: '/explorer', label: '3D Explorer', icon: 'M12 3 3 8v8l9 5 9-5V8L12 3Zm0 0v18M3 8l9 5 9-5' },
  { path: '/', label: 'Overview', icon: 'm3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7' },
  { path: '/inventory', label: 'Available homes', icon: 'M4 3h16v18H4V3Zm4 4h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2' },
  { path: '/virtual-tour', label: 'Virtual tour', icon: 'M3 5h12v14H3V5Zm12 5 6-4v12l-6-4' },
  { path: '/amenities', label: 'Amenities', icon: 'M4 17c2-3 4 3 6 0s4 3 6 0 4 3 6 0M6 13V5a2 2 0 0 1 4 0m4 8V5a2 2 0 0 1 4 0M6 8h8M6 12h8' },
  { path: '/gallery', label: 'Gallery', icon: 'M3 4h18v16H3V4Zm0 12 6-6 5 5 3-3 4 4M16 8h.01' },
  { path: '/location', label: 'Location', icon: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0' },
  { path: '/about', label: 'About us', icon: 'M12 8h.01M12 11v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0' },
  { path: '/contact', label: 'Book a visit', icon: 'M4 5h16v16H4V5Zm4-3v6m8-6v6M4 10h16m-12 4h3m2 0h3' },
];
function Glyph({ path }: { path: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d={path} /></svg>;
}
function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const slug = params.get('builder') || 'aethelgard';
  const explorer = pathname === '/explorer';
  const embedded = pathname.startsWith('/embed/');
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<any>({});
  const [builderName, setBuilderName] = useState('Aethelgard');
  const [menus, setMenus] = useState<any[]>([]);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);

  useEffect(() => {
    try { const saved = localStorage.getItem('aether:sidebar'); if (saved) setExpanded(saved === 'open'); } catch { /* Storage may be disabled. */ }
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname, slug]);
  useEffect(() => {
    if (!mobileOpen) return;
    sidebar.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileOpen(false); menuButton.current?.focus(); }
      if (event.key === 'Tab') {
        const items = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a,button') || []).filter(item => item.offsetParent !== null);
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [mobileOpen]);
  useEffect(() => {
    if (embedded) return;
    let active = true;
    setTheme({}); setMenus([]); setBuilderName(slug === 'aethelgard' ? 'Aethelgard' : slug);
    getBuilder(slug).then(builder => {
      if (!active) return;
      setTheme(builder.themeSettings || {}); setBuilderName(builder.name || slug);
      return publicJson(`/navigation/menus/by-name/Header?builderSlug=${encodeURIComponent(slug)}`, builder.id).then(menu => {
        if (active) setMenus(Array.isArray(menu.items) ? menu.items : []);
      });
    }).catch(() => { /* Navigation and the bundled explorer remain available offline. */ });
    return () => { active = false; };
  }, [slug, embedded]);
  useEffect(() => {
    if (embedded || explorer) return;
    const fonts = [theme.fontHeader || 'Bodoni Moda', theme.fontBody || 'Hanken Grotesk'];
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fonts.map(font => `family=${encodeURIComponent(font)}:wght@400;600;700`).join('&')}&display=swap`;
    document.head.appendChild(link);
    return () => link.remove();
  }, [theme.fontHeader, theme.fontBody, embedded, explorer]);

  if (embedded) return <div className="min-h-screen bg-[#0c0f16] text-stone-100">{children}</div>;
  const logo = theme.logo || builderName;
  const href = (path: string) => builderUrl(path, slug);
  const toggle = () => setExpanded(value => {
    try { localStorage.setItem('aether:sidebar', value ? 'closed' : 'open'); } catch { /* Optional preference. */ }
    return !value;
  });
  const styles = {
    '--font-heading': explorer ? 'system-ui, sans-serif' : `${theme.fontHeader || 'Bodoni Moda'}, serif`,
    '--font-body': explorer ? 'system-ui, sans-serif' : `${theme.fontBody || 'Hanken Grotesk'}, sans-serif`,
    '--primary': theme.primaryColor || '#d4af37', '--primary-container': theme.primaryColor || '#d4af37',
    '--background': theme.secondaryColor || '#131313', '--surface': theme.secondaryColor || '#131313',
    '--sidebar-width': expanded ? '240px' : '76px',
  } as React.CSSProperties;
  return <div style={styles} className="site-shell min-h-screen bg-background font-body text-on-surface" data-explorer={explorer}>
    <a href="#page-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded focus:bg-white focus:p-3 focus:text-black">Skip to content</a>
    <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 md:hidden">
      <button ref={menuButton} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="site-sidebar" onClick={() => setMobileOpen(true)} className="rounded-lg border border-white/20 p-2"><Glyph path="M4 6h16M4 12h16M4 18h16" /></button>
      <span className="text-sm font-medium">{explorer ? 'Property explorer' : logo}</span>
      <Link href={href('/contact')} className="text-xs text-primary">Book a visit</Link>
    </div>
    {mobileOpen && <button aria-label="Close navigation backdrop" tabIndex={-1} className="fixed inset-0 z-[1000] bg-black/60 md:hidden" onClick={() => { setMobileOpen(false); menuButton.current?.focus(); }} />}
    <aside ref={sidebar} id="site-sidebar" aria-label="Site navigation" className={`site-sidebar fixed bottom-0 left-0 top-0 z-[1001] flex flex-col border-r border-white/10 bg-[#171c1f] ${mobileOpen ? 'mobile-open' : ''}`} data-expanded={expanded}>
      <div className="flex h-20 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4">
        <span className="sidebar-label text-[10px] uppercase tracking-[.2em] text-white/45">Explore your next home</span>
        <button onClick={toggle} aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={expanded} aria-controls="site-nav-links" className="hidden shrink-0 rounded-lg p-2 text-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 md:block"><Glyph path={expanded ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'} /></button>
        <button className="rounded-lg p-2 md:hidden" aria-label="Close navigation" onClick={() => { setMobileOpen(false); menuButton.current?.focus(); }}><Glyph path="m6 6 12 12M6 18 18 6" /></button>
      </div>
      <nav id="site-nav-links" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navigation.map(item => <Link key={item.path} href={href(item.path)} title={item.label} aria-label={item.label} aria-current={pathname === item.path ? 'page' : undefined} onClick={() => setMobileOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 ${pathname === item.path ? 'bg-primary/15 text-primary' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}><Glyph path={item.icon} /><span className="sidebar-label whitespace-nowrap">{item.label}</span></Link>)}
      </nav>
      <div className="sidebar-label border-t border-white/10 p-5 text-xs leading-relaxed text-white/40">Find a space.<br /><span className="text-white/70">Make it your own.</span></div>
    </aside>
    <div className="site-content min-h-screen min-w-0">
      {!explorer && <header data-testid="site-header" className="hidden h-20 items-center justify-between gap-5 border-b border-white/10 px-6 md:flex">
        <Link href={href('/')} className="min-w-0 truncate font-heading text-xl font-semibold text-primary">{theme.logoUrl ? <img src={theme.logoUrl} alt={logo} className="h-9 max-w-48 object-contain" /> : logo}</Link>
        <nav aria-label="Builder links" className="hidden items-center gap-5 xl:flex">{menus.slice(0, 5).map(item => <Link key={item.id} href={href(item.url)} className="text-xs text-white/60 hover:text-primary">{item.title}</Link>)}</nav>
        <Link href={href('/contact')} className="shrink-0 rounded-lg border border-primary/40 px-4 py-2 text-xs text-primary">Book a visit</Link>
      </header>}
      <main id="page-content" tabIndex={-1} className="min-w-0 outline-none">{children}</main>
      {!explorer && <footer className="mt-12 border-t border-white/10 px-6 py-10 text-sm text-white/55">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8"><div><p className="font-heading text-xl text-primary">{logo}</p><p className="mt-2">{theme.footerTagline || 'Bespoke architectural landmarks'}</p>{theme.footerAddress && <p className="mt-3 max-w-sm">{theme.footerAddress}</p>}</div><div className="flex flex-wrap gap-5"><Link href={href('/contact')}>Contact us</Link>{theme.headerSocials?.phone && <a href={`tel:${theme.headerSocials.phone}`}>{theme.headerSocials.phone}</a>}{Object.entries(theme.footerSocials || {}).filter(([, url]) => typeof url === 'string' && /^https?:\/\//i.test(url)).map(([name, url]) => <a key={name} href={String(url)} target="_blank" rel="noopener noreferrer" className="capitalize">{name}</a>)}</div></div>
        <p className="mx-auto mt-8 max-w-6xl border-t border-white/5 pt-5 text-xs">{theme.footerCopyright || '© 2026. All rights reserved.'}</p>
      </footer>}
    </div>
  </div>;
}
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#131313] text-white"><PageSkeleton /></div>}><MainLayoutContent>{children}</MainLayoutContent></Suspense>;
}
