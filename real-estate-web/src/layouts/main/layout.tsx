'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { paths } from '@/routes/paths';
import PremiumButton from '@/components/premium-button';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';

interface MenuItem {
  id: string;
  title: string;
  url: string;
}

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const builderSlug = searchParams.get('builder') || 'aethelgard';

  const [logoText, setLogoText] = useState('Aethelgard');
  const [logoUrl, setLogoUrl] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [primaryColor, setPrimaryColor] = useState('#d4af37');
  const [secondaryColor, setSecondaryColor] = useState('#131313');
  const [fontHeader, setFontHeader] = useState('Bodoni Moda');
  const [fontBody, setFontBody] = useState('Hanken Grotesk');
  const [buttonStyle, setButtonStyle] = useState('square');
  const [cardStyle, setCardStyle] = useState('glass');
  const [headerStyle, setHeaderStyle] = useState('sticky');
  const [headerSocials, setHeaderSocials] = useState<any>({ whatsapp: '', phone: '', email: '' });
  const [footerCopyright, setFooterCopyright] = useState('© 2026. All Rights Reserved.');
  const [footerTagline, setFooterTagline] = useState('Bespoke Architectural landmarks');
  const [footerAddress, setFooterAddress] = useState('');
  const [footerSocials, setFooterSocials] = useState<any>({ facebook: '', instagram: '', linkedin: '', youtube: '' });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (fontHeader || fontBody) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${(fontHeader || 'Bodoni Moda').replace(/\s+/g, '+')}&family=${(fontBody || 'Hanken Grotesk').replace(/\s+/g, '+')}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, [fontHeader, fontBody]);

  useEffect(() => {
    // 1. Fetch theme settings
    fetch(`http://localhost:3001/builders/theme-by-slug/${builderSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.themeSettings) {
          const s = data.themeSettings;
          if (s.logo) setLogoText(s.logo);
          if (s.logoUrl !== undefined) setLogoUrl(s.logoUrl || '');
          if (s.primaryColor) setPrimaryColor(s.primaryColor);
          if (s.secondaryColor) setSecondaryColor(s.secondaryColor);
          if (s.fontHeader) setFontHeader(s.fontHeader);
          if (s.fontBody) setFontBody(s.fontBody);
          if (s.buttonStyle) setButtonStyle(s.buttonStyle);
          if (s.cardStyle) setCardStyle(s.cardStyle);
          if (s.headerStyle) setHeaderStyle(s.headerStyle);
          if (s.headerSocials) setHeaderSocials(s.headerSocials);
          if (s.footerCopyright) setFooterCopyright(s.footerCopyright);
          if (s.footerTagline) setFooterTagline(s.footerTagline);
          if (s.footerAddress !== undefined) setFooterAddress(s.footerAddress || '');
          if (s.footerSocials) setFooterSocials(s.footerSocials);
        }
      })
      .catch(() => {});

    // 2. Fetch Header Menu items
    fetch(`http://localhost:3001/navigation/menus/by-name/Header?builderSlug=${builderSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.items) {
          setMenuItems(data.items);
        }
      })
      .catch(() => {});
  }, [builderSlug]);

  const isActive = (path: string) => pathname === path;

  const getDynamicUrl = (url: string) => {
    if (url.startsWith('http') || url.startsWith('//') || url.startsWith('#')) return url;
    const hasQuery = url.includes('?');
    return `${url}${hasQuery ? '&' : '?'}builder=${builderSlug}`;
  };

  const getHeaderClasses = () => {
    const base = "fixed z-[998] transition-all duration-500 border-white/10";
    
    if (headerStyle === 'floating') {
      return `${base} border rounded-2xl md:rounded-full shadow-2xl bg-surface/85 backdrop-blur-md top-4 left-4 right-4 md:left-24 lg:left-28 md:right-6 xl:right-10 ${
        scrolled ? 'py-3 h-18' : 'py-4.5 h-20'
      }`;
    }
    
    if (headerStyle === 'transparent') {
      return `${base} border-b top-0 left-0 right-0 ${
        scrolled ? 'py-4 bg-surface/95 backdrop-blur-md h-20 shadow-xl' : 'bg-transparent py-6 h-24 border-transparent'
      }`;
    }
    
    // sticky / default
    return `${base} border-b top-0 left-0 right-0 bg-surface/90 backdrop-blur-md ${
      scrolled ? 'py-4 h-20 shadow-xl' : 'py-6 h-24'
    }`;
  };

  const themeStyles = {
    '--font-heading': `${fontHeader || 'Bodoni Moda'}, serif`,
    '--font-body': `${fontBody || 'Hanken Grotesk'}, sans-serif`,
    '--primary': primaryColor,
    '--primary-container': primaryColor,
    '--background': secondaryColor || '#131313',
    '--surface': secondaryColor || '#131313',
  } as React.CSSProperties;

  const btnRadius = buttonStyle === 'pill' ? 'rounded-full' : buttonStyle === 'rounded' ? 'rounded-xl' : 'rounded-none';

  return (
    <div 
      className="bg-background text-on-surface min-h-screen relative font-body selection:bg-primary/30"
      style={themeStyles}
    >
      {/* Top Navigation Bar */}
      <nav className={getHeaderClasses()}>
        <div className="flex justify-between items-center px-6 md:px-margin-desktop max-w-container-max mx-auto h-full">
          <Link href={getDynamicUrl('/')} className="font-display-xl text-[24px] md:text-headline-md tracking-tight font-bold hover:opacity-90 flex items-center gap-2" style={{ color: primaryColor }}>
            {logoUrl ? (
              <img src={logoUrl} alt={logoText} className="h-8 md:h-10 w-auto object-contain" />
            ) : (
              logoText
            )}
          </Link>
 
          <div className="hidden xl:flex items-center gap-8">
            {menuItems.map((item) => (
              <NavLink key={item.id} href={getDynamicUrl(item.url)} label={item.title} active={isActive(item.url)} />
            ))}
          </div>

          <div className="flex items-center gap-6">
            {headerSocials.phone && (
              <a href={`tel:${headerSocials.phone}`} className="hidden xl:flex items-center gap-1.5 text-xs text-on-surface/75 hover:text-primary transition-colors">
                <Icon icon="solar:phone-bold-duotone" className="text-primary" />
                <span>Call Concierge</span>
              </a>
            )}
            {headerSocials.whatsapp && (
              <a href={headerSocials.whatsapp} target="_blank" rel="noopener noreferrer" className="hidden xl:flex items-center gap-1.5 text-xs text-emerald-500 hover:underline">
                <Icon icon="solar:chat-round-bold-duotone" />
                <span>WhatsApp</span>
              </a>
            )}
            <Link href={getDynamicUrl('/contact')}>
              <PremiumButton variant="primary" className={`hidden lg:block ${btnRadius}`}>
                Book a Visit
              </PremiumButton>
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-primary hover:scale-105 active:scale-95 transition-all md:hidden"
            >
              <Icon icon="solar:hamburger-menu-bold-duotone" width="32" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {menuOpen && (
          <div className="absolute top-full left-0 right-0 bg-surface-container border-b border-white/10 backdrop-blur-xl p-6 flex flex-col gap-4 md:hidden animate-[fadeInUp_0.3s_ease] z-[998]">
            {menuItems.map((item) => (
              <Link key={item.id} href={getDynamicUrl(item.url)} onClick={() => setMenuOpen(false)} className={`font-label-caps text-label-caps tracking-widest py-2 uppercase ${isActive(item.url) ? 'text-primary font-bold' : 'text-on-surface/70'}`}>
                {item.title}
              </Link>
            ))}
            <Link href={getDynamicUrl('/contact')} onClick={() => setMenuOpen(false)}>
              <PremiumButton variant="primary" className={`w-full mt-2 ${btnRadius}`}>
                Book a Visit
              </PremiumButton>
            </Link>
          </div>
        )}
      </nav>

      {/* Hover-Expanding Side Navigation Panel (Desktop only) */}
      <aside 
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`fixed left-0 top-0 h-full z-[999] flex flex-col hidden md:flex transition-all duration-500 bg-surface-container/60 backdrop-blur-2xl border-r border-white/10 shadow-2xl group overflow-hidden ${sidebarHovered ? 'w-64' : 'w-20'}`}
      >
        <div className="mt-32 px-4 flex flex-col gap-6">
          <SidebarItem 
            href={paths.virtualTour} 
            icon="solar:globus-bold-duotone" 
            label="Virtual Tour" 
            isExpanded={sidebarHovered} 
            active={isActive(paths.virtualTour)}
          />
          <SidebarItem 
            href={paths.explorer} 
            icon="solar:city-bold-duotone" 
            label="3D Explorer" 
            isExpanded={sidebarHovered} 
            active={isActive(paths.explorer)}
          />
          <SidebarItem 
            href={paths.inventory} 
            icon="solar:layers-bold-duotone" 
            label="Floor Plan" 
            isExpanded={sidebarHovered} 
            active={isActive(paths.inventory)}
          />
          <SidebarItem 
            href={paths.amenities} 
            icon="solar:swimming-bold-duotone" 
            label="Amenities" 
            isExpanded={sidebarHovered} 
            active={isActive(paths.amenities)}
          />
          <SidebarItem 
            href={paths.location} 
            icon="solar:map-point-bold-duotone" 
            label="Location" 
            isExpanded={sidebarHovered} 
            active={isActive(paths.location)}
          />
          <SidebarItem 
            href={paths.about} 
            icon="solar:users-group-rounded-bold-duotone" 
            label="About Us" 
            isExpanded={sidebarHovered} 
            active={isActive(paths.about)}
          />
        </div>
        
        <div className="mt-auto mb-10 px-6">
          <button className={`w-full bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary py-4 ${sidebarHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'} transition-all duration-500 font-label-caps text-[10px] tracking-[0.2em] rounded uppercase font-bold`}>
            Brochure
          </button>
        </div>
      </aside>

      {/* Main Content Space */}
      <main className={`transition-all duration-500 min-h-screen flex flex-col justify-between ${sidebarHovered ? 'md:pl-64' : 'md:pl-20'}`}>
        <div className="flex-1 w-full pt-24">
          {children}
        </div>

        {/* Dynamic Premium Footer */}
        <footer className="bg-surface border-t border-white/10 py-16 px-6 md:px-margin-desktop text-on-surface/80 mt-auto">
          <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Column 1: Logo & Tagline */}
            <div className="space-y-4 md:col-span-2">
              <span className="text-2xl font-bold tracking-wider block font-heading" style={{ color: primaryColor }}>
                {logoText}
              </span>
              <p className="text-sm text-on-surface/60 max-w-sm italic">
                {footerTagline}
              </p>
              
              {/* Info contacts */}
              <div className="flex flex-wrap gap-4 text-xs pt-2 text-on-surface/50">
                {headerSocials.phone && (
                  <span className="flex items-center gap-1.5">
                    <Icon icon="solar:phone-bold-duotone" className="text-primary" />
                    {headerSocials.phone}
                  </span>
                )}
                {headerSocials.email && (
                  <span className="flex items-center gap-1.5">
                    <Icon icon="solar:letter-bold-duotone" className="text-primary" />
                    {headerSocials.email}
                  </span>
                )}
                {headerSocials.whatsapp && (
                  <a href={headerSocials.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-emerald-500 hover:underline">
                    <Icon icon="solar:chat-round-bold-duotone" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-primary uppercase tracking-widest block">Quick Links</span>
              <div className="flex flex-col gap-2.5 text-sm">
                {menuItems.map((item) => (
                  <Link key={item.id} href={getDynamicUrl(item.url)} className="hover:text-primary transition-colors">
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 3: Address & Socials */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-primary uppercase tracking-widest block font-sans">Contact & Address</span>
              {footerAddress ? (
                <p className="text-sm text-on-surface/60 leading-relaxed font-sans">
                  {footerAddress}
                </p>
              ) : (
                <p className="text-sm text-on-surface/40 leading-relaxed font-sans italic">
                  Address details not configured.
                </p>
              )}

              {/* Social Redirect Icons */}
              <div className="flex gap-4 pt-1.5">
                {footerSocials.facebook && (
                  <a href={footerSocials.facebook} target="_blank" rel="noopener noreferrer" className="text-on-surface/60 hover:text-primary transition-all scale-100 hover:scale-110">
                    <Icon icon="bi:facebook" width="20" />
                  </a>
                )}
                {footerSocials.instagram && (
                  <a href={footerSocials.instagram} target="_blank" rel="noopener noreferrer" className="text-on-surface/60 hover:text-primary transition-all scale-100 hover:scale-110">
                    <Icon icon="bi:instagram" width="20" />
                  </a>
                )}
                {footerSocials.linkedin && (
                  <a href={footerSocials.linkedin} target="_blank" rel="noopener noreferrer" className="text-on-surface/60 hover:text-primary transition-all scale-100 hover:scale-110">
                    <Icon icon="bi:linkedin" width="20" />
                  </a>
                )}
                {footerSocials.youtube && (
                  <a href={footerSocials.youtube} target="_blank" rel="noopener noreferrer" className="text-on-surface/60 hover:text-primary transition-all scale-100 hover:scale-110">
                    <Icon icon="bi:youtube" width="20" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-container-max mx-auto border-t border-white/5 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-on-surface/40 gap-4">
            <span>{footerCopyright}</span>
            <div className="flex gap-6">
              <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`font-label-caps text-[11px] tracking-widest pb-1 border-b-2 transition-all duration-300 uppercase ${
        active ? 'text-primary border-primary font-bold' : 'text-on-surface/70 border-transparent hover:text-primary'
      }`}
    >
      {label}
    </Link>
  );
}

function SidebarItem({ href, icon, label, isExpanded, active }: { href: string, icon: string, label: string, isExpanded: boolean, active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-4 transition-all duration-300 hover:bg-primary/5 p-3 rounded-lg group/item ${active ? 'bg-primary/10 text-primary' : 'text-on-surface-variant'}`}
    >
      <Icon 
        icon={icon} 
        width="28" 
        className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'scale-100' : 'scale-110 ml-1'} group-hover/item:scale-110 ${active ? 'text-primary' : 'text-primary/70'}`} 
      />
      <span className={`font-label-caps text-[11px] whitespace-nowrap transition-all duration-500 tracking-[0.15em] uppercase ${isExpanded ? 'opacity-100 translate-x-0 font-bold' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
        {label}
      </span>
    </Link>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <MainLayoutContent>{children}</MainLayoutContent>
    </Suspense>
  );
}
