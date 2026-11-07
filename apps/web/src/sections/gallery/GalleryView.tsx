'use client';

import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { getAssetUrl } from '@/config/api';

export default function GalleryPage() {
  const [filter, setFilter] = useState('All');
  const galleryRef = useRef<HTMLDivElement>(null);

  const categories = ['All', 'Exterior', 'Interior', 'Amenities', 'Night View'];

  const images = [
    {
      url: getAssetUrl('/images/hero-skyline.jpg'),
      title: 'Obsidian Twilight Skyscraper',
      desc: 'The dramatic silhouette of Aethelgard against twilight skies.',
      category: 'Night View'
    },
    {
      url: getAssetUrl('/images/suite-terrace.jpg'),
      title: 'Private Sky Penthouse Terraces',
      desc: 'Sunrise flooding modern velvet textures and broad-plank oak.',
      category: 'Interior'
    },
    {
      url: getAssetUrl('/images/infinity-pool.jpg'),
      title: 'Level 42 Infinity Oasis',
      desc: 'Zero-edge pool reflecting basalt walls under underwater lighting.',
      category: 'Amenities'
    },
    {
      url: getAssetUrl('/images/marble-interior.jpg'),
      title: 'Bespoke Marble Interior Installation',
      desc: 'High-end slab matching in the grand lobbies.',
      category: 'Interior'
    },
    {
      url: getAssetUrl('/images/facade.jpg'),
      title: 'Architectural Facade',
      desc: 'The geometric precision of the outer shell.',
      category: 'Exterior'
    },
    {
      url: getAssetUrl('/images/spa-wellness.jpg'),
      title: 'Sky Garden Retreat & Spa',
      desc: 'Lush greenery integrated into high-altitude terraces.',
      category: 'Exterior'
    }
  ];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      gsap.fromTo('.anim-card',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    }, galleryRef);
    return () => context.revert();
  }, [filter]);

  const filteredImages = filter === 'All' ? images : images.filter(img => img.category === filter);

  return (
    <div ref={galleryRef} className="pt-24 px-6 md:px-margin-desktop max-w-container-max mx-auto py-20 min-h-screen">
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
            aria-pressed={filter === cat}
            onClick={() => setFilter(cat)}
            className={`px-6 py-2 text-[10px] font-label-caps tracking-[0.2em] border transition-all duration-300 rounded-full ${
              filter === cat
                ? 'bg-primary text-on-primary border-primary font-bold'
                : 'bg-transparent border-outline-variant text-on-surface hover:border-primary/50'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {filteredImages.map((img) => (
          <div key={img.url} className="group relative overflow-hidden bg-surface-container aspect-square rounded-2xl border border-outline-variant shadow-sm anim-card">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none"
              alt={img.title}
              src={img.url}
              loading="lazy"
              decoding="async"
              width={640}
              height={640}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-warm-brown/95 via-warm-brown/10 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 transition-transform duration-500 group-hover:translate-y-[-5px]">
              <span className="font-label-caps text-[10px] text-warm-sand tracking-[0.2em] uppercase">{img.category}</span>
              <h3 className="font-display-xl text-xl text-warm-cream mt-1 mb-1 font-light">{img.title}</h3>
              <p className="text-xs text-warm-linen leading-relaxed font-body-md max-w-sm line-clamp-2">{img.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
