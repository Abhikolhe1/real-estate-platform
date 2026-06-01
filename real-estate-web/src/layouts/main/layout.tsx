'use client';

import React from 'react';
import { paths } from '@/routes/paths';
import PremiumButton from '@/components/premium-button';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen">
      {/* Consumer Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-gray-950/70 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-12 md:px-20 z-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <span className="text-lg font-black tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">ELITE HORIZON</span>
        </div>

        <div className="hidden md:flex gap-8 text-sm font-medium">
          <a href={paths.home} className="text-white hover:text-white transition-all">Home</a>
          <a href="#" className="text-gray-400 hover:text-white transition-all">Properties</a>
          <a href="#" className="text-gray-400 hover:text-white transition-all">Portfolio</a>
          <a href="#" className="text-gray-400 hover:text-white transition-all">Amenities</a>
          <a href="#" className="text-gray-400 hover:text-white transition-all">Virtual Tour</a>
        </div>

        <PremiumButton variant="primary">Schedule Tour</PremiumButton>
      </nav>

      {/* Main Content Space */}
      <main>
        {children}
      </main>
    </div>
  );
}
