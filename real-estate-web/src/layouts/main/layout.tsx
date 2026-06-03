'use client';

import React, { useState, useEffect } from 'react';
import { paths } from '@/routes/paths';
import PremiumButton from '@/components/premium-button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const pathname = usePathname();

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

  const isActive = (path: string) => pathname === path;

  return (
    <div className="bg-background text-on-surface min-h-screen relative font-body selection:bg-primary/30">
      {/* Top Navigation Bar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[998] border-b border-white/10 shadow-xl transition-all duration-500 ${
          scrolled
            ? 'py-4 bg-surface/90 backdrop-blur-md h-20'
            : 'py-6 bg-surface/30 backdrop-blur-xl h-24'
        }`}
      >
        <div className="flex justify-between items-center px-6 md:px-margin-desktop max-w-container-max mx-auto h-full">
          <Link href={paths.home} className="font-display-xl text-[28px] md:text-headline-md tracking-tight text-primary font-bold hover:opacity-90">
            Aethelgard
          </Link>

          <div className="hidden xl:flex items-center gap-8">
             <NavLink href={paths.about} label="About" active={isActive(paths.about)} />
             <NavLink href={paths.gallery} label="Gallery" active={isActive(paths.gallery)} />
             <NavLink href={paths.amenities} label="Amenities" active={isActive(paths.amenities)} />
             <NavLink href={paths.location} label="Location" active={isActive(paths.location)} />
             <NavLink href={paths.inventory} label="Inventory" active={isActive(paths.inventory)} />
          </div>

          <div className="flex items-center gap-6">
            <Link href={paths.contact}>
              <PremiumButton variant="primary" className="hidden lg:block">
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
            {Object.entries(paths).map(([key, path]) => (
              path !== '/' && (
                <Link key={key} href={path} onClick={() => setMenuOpen(false)} className={`font-label-caps text-label-caps tracking-widest py-2 uppercase ${isActive(path) ? 'text-primary font-bold' : 'text-on-surface/70'}`}>
                  {key}
                </Link>
              )
            ))}
            <Link href={paths.contact} onClick={() => setMenuOpen(false)}>
              <PremiumButton variant="primary" className="w-full mt-2">
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
        <div className="flex-1 w-full">
          {children}
        </div>
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
