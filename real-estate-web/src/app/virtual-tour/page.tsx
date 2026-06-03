'use client';

import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { paths } from '@/routes/paths';

export default function VirtualTourPage() {
  const [currentRoom, setCurrentRoom] = useState('Grand Lobby');
  const [isNight, setIsNight] = useState(false);
  const [showUI, setShowUI] = useState(true);

  const rooms = [
    { name: 'Grand Lobby', image: 'https://images.unsplash.com/photo-1573812195421-50a396d17fb7?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Infinity Pool', image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Sky Penthouse', image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Master Suite', image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=2000' }
  ];

  useEffect(() => {
    // Initial Reveal
    gsap.fromTo('.tour-viewport', 
      { scale: 1.1, filter: 'blur(20px)' },
      { scale: 1, filter: 'blur(0px)', duration: 2, ease: 'power2.out' }
    );
  }, [currentRoom]);

  const activeImage = rooms.find(r => r.name === currentRoom)?.image;

  return (
    <div className="fixed inset-0 bg-black z-[1000] overflow-hidden text-white font-body">
      {/* Background Layer: 360 Simulated Viewport */}
      <div className={`tour-viewport relative w-full h-full transition-all duration-1000 ease-in-out ${isNight ? 'brightness-50' : 'brightness-100'}`}>
        <img 
          src={activeImage} 
          alt={currentRoom} 
          className="w-full h-full object-cover transition-transform duration-[10000ms] hover:scale-110"
        />
        
        {/* Hotspots Simulation */}
        {showUI && (
          <>
             <Hotspot x="30%" y="45%" label="Dining Area" />
             <Hotspot x="65%" y="60%" label="Balcony View" />
             <Hotspot x="50%" y="40%" label="Art Gallery" />
          </>
        )}

        {/* Night Overlay */}
        <div className={`absolute inset-0 bg-blue-900/10 pointer-events-none transition-opacity duration-1000 ${isNight ? 'opacity-40' : 'opacity-0'}`}></div>
      </div>

      {/* Top Controls */}
      <div className={`absolute top-8 left-8 right-8 flex justify-between items-center transition-all duration-500 ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        <div className="flex items-center gap-6">
          <Link href={paths.home} className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all">
            <Icon icon="solar:home-2-bold-duotone" className="text-xl" />
          </Link>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full">
            <h1 className="font-display-xl text-lg tracking-widest uppercase font-light">Aether Reality: {currentRoom}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsNight(!isNight)}
            className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full hover:bg-white/20 transition-all group"
          >
            <Icon icon={isNight ? "solar:sun-bold-duotone" : "solar:moon-bold-duotone"} className="text-xl group-hover:scale-110 transition-transform" />
            <span className="font-label-caps text-[10px] tracking-widest font-bold uppercase">{isNight ? 'Day Mode' : 'Night Mode'}</span>
          </button>
          
          <button 
             onClick={() => setShowUI(!showUI)}
             className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all"
          >
            <Icon icon={showUI ? "solar:eye-closed-bold-duotone" : "solar:eye-bold-duotone"} className="text-xl" />
          </button>
        </div>
      </div>

      {/* Side Room Selector */}
      <div className={`absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 transition-all duration-500 ${showUI ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
        {rooms.map((room) => (
          <button
            key={room.name}
            onClick={() => setCurrentRoom(room.name)}
            className={`flex items-center gap-4 group transition-all duration-300 ${currentRoom === room.name ? 'translate-x-4' : 'hover:translate-x-2'}`}
          >
            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${currentRoom === room.name ? 'bg-primary scale-125 shadow-[0_0_15px_rgba(var(--primary-rgb),1)]' : 'bg-white/20'}`}></div>
            <span className={`font-label-caps text-[11px] tracking-[0.2em] uppercase font-bold transition-colors ${currentRoom === room.name ? 'text-primary' : 'text-white/40 group-hover:text-white'}`}>{room.name}</span>
          </button>
        ))}
      </div>

      {/* Mini Map Placeholder */}
      <div className={`absolute bottom-8 right-8 w-64 h-48 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 transition-all duration-500 ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex justify-between items-center mb-4">
          <span className="font-label-caps text-[9px] text-primary tracking-widest uppercase font-bold">L42 Floor Plan</span>
          <Icon icon="solar:map-bold-duotone" className="text-primary text-lg" />
        </div>
        <div className="relative w-full h-full bg-white/5 rounded-lg border border-dashed border-white/10 flex items-center justify-center">
          <div className="absolute inset-4 grid grid-cols-3 grid-rows-3 gap-2 opacity-20">
             {[...Array(9)].map((_, i) => <div key={i} className="border border-white/50"></div>)}
          </div>
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(var(--primary-rgb),1)]"></div>
          <span className="text-[8px] text-white/20 mt-12 font-label-caps uppercase tracking-widest">Active Zone</span>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center pointer-events-none opacity-40">
        <Icon icon="solar:mouse-bold-duotone" className="text-3xl mx-auto mb-2 animate-bounce" />
        <p className="font-label-caps text-[9px] tracking-[0.3em] uppercase">Use Mouse to Explore 360 View</p>
      </div>
    </div>
  );
}

function Hotspot({ x, y, label }: { x: string; y: string; label: string }) {
  return (
    <div 
      className="absolute group cursor-pointer" 
      style={{ left: x, top: y }}
    >
      <div className="relative">
        <div className="w-8 h-8 bg-primary/20 rounded-full animate-ping"></div>
        <div className="absolute inset-0 w-8 h-8 bg-primary/40 rounded-full backdrop-blur-sm border border-primary flex items-center justify-center group-hover:bg-primary transition-all duration-300 shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]">
          <Icon icon="solar:info-square-bold-duotone" className="text-white text-sm" />
        </div>
      </div>
      <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 whitespace-nowrap bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded text-[10px] font-label-caps tracking-widest font-bold text-primary">
        {label.toUpperCase()}
      </div>
    </div>
  );
}
