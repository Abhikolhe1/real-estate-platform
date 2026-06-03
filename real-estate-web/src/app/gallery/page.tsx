'use client';

import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';

export default function GalleryPage() {
  const [filter, setFilter] = useState('All');

  const categories = ['All', 'Exterior', 'Interior', 'Amenities', 'Night View'];

  const images = [
    {
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E',
      title: 'Obsidian Twilight Skyscraper',
      desc: 'The dramatic silhouette of Aethelgard against twilight skies.',
      category: 'Night View'
    },
    {
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALub8tldhZ_oMsDBRNKvmeXkewkHSlaNawnWde8Xoltrq0FSdntj93gg8_tlgdCPs1sX8IUmXuDlrojoVQ9QLZjHLlaeN41Qp_MiMdpQ2C1neDNmt9MWzLGhTG6IiOVbDfeZbT8ip3VFdJ5gjtfB8mQj-9uU6Ear6AraJyfkHXMyT7S-q7BLRg0NQO3d1J_lhzuXOsyTBKlhZOKt0d2LNE5__yhPDr1aL2pU1cGStdoz1seLCZxe7JpdEIkwyWYpBxdOcVXoeUaEY',
      title: 'Private Sky Penthouse Terraces',
      desc: 'Sunrise flooding modern velvet textures and broad-plank oak.',
      category: 'Interior'
    },
    {
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr28uHqFUXU1-6oqJKy3H8H0P8wAh2ZOivH0xSDCfso4Y_Xb1gI-e8rBONeD9EF-H27ir1ARdke5aDiY1CvNLqDuihLjYmGKq1MoFG4Gl1LCXLHboR5rnB0LWIZnjPYXI4JBBVc_mHNuqF5FaaqjudHxOFXXErQBlWNhEfyoQXA7iWevn8AMNmdzjSalTnZ775wingAAKF2urxtQ-OSe0_bBOzzpU6HnTu4efJV85W_Y0VFve4ibvEtwe5_Ts1eB1tQxMwTe3wpsY',
      title: 'Level 42 Infinity Oasis',
      desc: 'Zero-edge pool reflecting basalt walls under underwater lighting.',
      category: 'Amenities'
    },
    {
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARVrp_cpUsHq2kW7_GHWoI5Rv07QzT9JC3CTOepqQzqsN-WoIji4_Cpv6Be3YuPpe7Hf1zKpBfwaJLD1KYl5KXhNYTtYhCtm1Mwon5z7gCY67oZZeMpnePklZv3iqLM7E_ZD8Xz9CXqFZdKeTSUDXb4bmReanQSJKF8y5lVJbOtEbm5vMDlWBpC4xKT_j18vPzbZxle3-mbF7ohFVDd76xvyVCBiyiNaJ5rW00q92EA6a768YkTJbe1CblAVLqlXpi283ka4qBryU',
      title: 'Bespoke Marble Interior Installation',
      desc: 'High-end slab matching in the grand lobbies.',
      category: 'Interior'
    },
    {
      url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1000',
      title: 'Architectural Facade',
      desc: 'The geometric precision of the outer shell.',
      category: 'Exterior'
    },
    {
      url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000',
      title: 'Sky Garden Retreat',
      desc: 'Lush greenery integrated into high-altitude terraces.',
      category: 'Exterior'
    }
  ];

  useEffect(() => {
    gsap.fromTo('.anim-card',
      { opacity: 0, scale: 0.95, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out' }
    );
  }, [filter]);

  const filteredImages = filter === 'All' ? images : images.filter(img => img.category === filter);

  return (
    <div className="pt-24 px-6 md:px-margin-desktop max-w-container-max mx-auto py-20 min-h-screen">
      <header className="mb-16 text-center max-w-2xl mx-auto">
        <span className="font-label-caps text-primary tracking-[0.3em] uppercase text-[10px] block mb-3">EDITORIAL ARCHIVE</span>
        <h1 className="font-display-xl text-4xl md:text-headline-lg font-light text-on-surface">Visual Showcase</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-4 leading-relaxed">
          Explore the architectural majesty and interior finesse of Aethelgard through our curated gallery.
        </p>
      </header>

      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-6 py-2 text-[10px] font-label-caps tracking-[0.2em] border transition-all duration-300 rounded-full ${
              filter === cat
                ? 'bg-primary text-on-primary border-primary font-bold'
                : 'bg-transparent border-white/10 text-on-surface hover:border-primary/50'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {filteredImages.map((img, idx) => (
          <div key={idx} className="group relative overflow-hidden bg-surface-container aspect-square rounded border border-white/5 shadow-2xl anim-card">
            <img
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 brightness-[60%] group-hover:brightness-75"
              alt={img.title}
              src={img.url}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90"></div>
            <div className="absolute bottom-6 left-6 right-6 transition-transform duration-500 group-hover:translate-y-[-5px]">
              <span className="font-label-caps text-[8px] text-primary tracking-[0.2em] uppercase">{img.category}</span>
              <h3 className="font-display-xl text-xl text-on-surface mt-1 mb-1 font-light">{img.title}</h3>
              <p className="text-[10px] text-on-surface-variant leading-relaxed font-body-md max-w-sm line-clamp-2">{img.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
