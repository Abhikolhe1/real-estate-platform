'use client';

import React, { useState, useEffect, useRef } from 'react';
import PremiumButton from '@/components/premium-button';
import { gsap } from 'gsap';

export default function HomeView() {
  const [activeTower, setActiveTower] = useState('Obsidian Tower');
  const [flatSelection, setFlatSelection] = useState<any>({
    number: '4201',
    type: '4 BHK Grand Penthouse',
    size: '4,850 sqft',
    price: '$1,850,000',
    status: 'Available'
  });

  const towerGridRef = useRef<HTMLDivElement>(null);

  const towers = [
    { name: 'Obsidian Tower', description: 'Premium 3 & 4 BHK residences with skyline panoramas.' },
    { name: 'Aurum Penthouse Suites', description: 'Limited-edition bespoke double-height penthouses.' },
    { name: 'Aether Residences', description: 'Intelligent automation-first residences with wrap-around decks.' }
  ];

  const inventory: Record<string, Array<{ number: string; type: string; size: string; price: string; status: 'Available' | 'Reserved' | 'Sold' }>> = {
    'Obsidian Tower': [
      { number: '4201', type: '4 BHK Grand Penthouse', size: '4,850 sqft', price: '$1,850,000', status: 'Available' },
      { number: '3802', type: '3 BHK Ultra Suite', size: '2,900 sqft', price: '$980,000', status: 'Reserved' },
      { number: '3501', type: '3 BHK Premier Room', size: '2,450 sqft', price: '$820,000', status: 'Available' },
      { number: '3002', type: '3 BHK Premier Room', size: '2,450 sqft', price: '$815,000', status: 'Sold' },
    ],
    'Aurum Penthouse Suites': [
      { number: 'PH-1', type: '5 BHK Duplex Penthouse', size: '6,200 sqft', price: '$3,200,000', status: 'Available' },
      { number: 'PH-2', type: '4 BHK Sky Mansion', size: '5,100 sqft', price: '$2,450,000', status: 'Reserved' },
    ],
    'Aether Residences': [
      { number: '2401', type: '3 BHK Smart Living', size: '2,200 sqft', price: '$780,000', status: 'Available' },
      { number: '2002', type: '3 BHK Smart Living', size: '2,200 sqft', price: '$775,000', status: 'Available' },
      { number: '1801', type: '2 BHK Smart Living', size: '1,650 sqft', price: '$590,000', status: 'Sold' },
    ]
  };

  useEffect(() => {
    // Initial entrance animation
    gsap.fromTo('.anim-fade-up', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out' }
    );
  }, []);

  // Animate inventory changes smoothly
  useEffect(() => {
    if (towerGridRef.current) {
      gsap.fromTo(towerGridRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [activeTower]);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Cinematic Hero Section */}
      <section id="gallery" className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Background Video Placeholder with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            className="w-full h-full object-cover grayscale-[20%] brightness-[35%] transition-all duration-1000 hover:scale-105" 
            alt="Cinematic Skyscraper Architecture"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background"></div>
        </div>

        {/* Content Area */}
        <div className="relative z-10 text-center px-6 md:px-margin-desktop max-w-5xl">
          <p className="font-label-caps text-label-caps text-primary mb-6 tracking-[0.3em] anim-fade-up">RESIDENTIAL EXCELLENCE</p>
          <h1 className="font-display-xl text-[44px] md:text-display-xl leading-tight mb-8 text-on-surface font-light anim-fade-up">
            The Pinnacle of <br/><span className="italic font-normal text-primary">Urban Living</span>
          </h1>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center anim-fade-up">
            <PremiumButton variant="primary" onClick={() => {
              const el = document.getElementById('inventory');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}>
              Explore Project
            </PremiumButton>
            <PremiumButton variant="outline" onClick={() => {
              const el = document.getElementById('virtual-tour');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}>
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" data-icon="play_circle">play_circle</span>
                Virtual Tour
              </span>
            </PremiumButton>
          </div>
        </div>

        {/* Floating Stat Cards */}
        <div className="absolute bottom-16 left-6 right-6 md:left-margin-desktop md:right-margin-desktop hidden lg:flex justify-between items-end z-20">
          <div className="glass-panel p-8 min-w-[260px] rounded border-white/10">
            <p className="text-primary font-display-xl text-headline-md leading-none mb-2 font-bold">90%</p>
            <p className="font-label-caps text-label-caps text-on-surface/60 tracking-wider">Construction Complete</p>
            <div className="h-[1px] w-full bg-outline-variant mt-4 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-primary w-[90%]"></div>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-3 animate-bounce cursor-pointer" onClick={() => {
            const el = document.getElementById('concept');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>
            <span className="font-label-caps text-[10px] text-on-surface/40 uppercase tracking-[0.2em]">Scroll To Discover</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-primary to-transparent"></div>
          </div>

          <div className="glass-panel p-8 min-w-[260px] rounded border-white/10">
            <p className="text-primary font-display-xl text-headline-md leading-none mb-2 font-bold">40+</p>
            <p className="font-label-caps text-label-caps text-on-surface/60 tracking-wider">Bespoke Amenities</p>
            <div className="flex gap-1.5 mt-4">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="material-symbols-outlined text-xs text-primary" data-icon="star">star</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Project Concept / Overview Section */}
      <section id="concept" className="bg-surface py-section-gap px-6 md:px-margin-desktop border-t border-white/5">
        <div className="max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
          <div className="lg:col-span-5 mb-12 lg:mb-0">
            <p className="font-label-caps text-label-caps text-primary mb-4 tracking-widest">THE CONCEPT</p>
            <h2 className="font-headline-lg text-[32px] md:text-headline-lg mb-8 text-on-surface font-light leading-tight">
              A New Paradigm of <br/><span className="italic font-normal text-primary">Architectural Artistry</span>
            </h2>
            <p className="font-body-lg text-body-md text-on-surface-variant mb-12 max-w-lg leading-relaxed">
              Designed by the visionaries at Aethelgard, this residence is more than a home; it is a meticulously crafted gallery for life. Every slab of marble, every brushed brass fitting, and every panoramic glass pane is curated to provide a sensory experience that redefines urban luxury.
            </p>
            <div className="space-y-8">
              <div className="flex items-start gap-6 border-b border-outline-variant pb-6">
                <span className="material-symbols-outlined text-primary text-3xl shrink-0" data-icon="verified_user">verified_user</span>
                <div>
                  <h4 className="font-label-caps text-label-caps text-on-surface mb-1 font-bold tracking-wider">RERA REGISTERED</h4>
                  <p className="text-xs text-on-surface/50 font-body-md tracking-wider">PRM/KA/RERA/1251/446/PR/210302</p>
                </div>
              </div>
              <div className="flex items-start gap-6 border-b border-outline-variant pb-6">
                <span className="material-symbols-outlined text-primary text-3xl shrink-0" data-icon="location_city">location_city</span>
                <div>
                  <h4 className="font-label-caps text-label-caps text-on-surface mb-1 font-bold tracking-wider">BUILDER LEGACY</h4>
                  <p className="text-xs text-on-surface/50 font-body-md tracking-wider">Aethelgard Group - 40 Years of Excellence</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="group overflow-hidden relative aspect-[4/5] bg-surface-container-high rounded border border-white/5">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt="Private Terraces Penthouse View"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuALub8tldhZ_oMsDBRNKvmeXkewkHSlaNawnWde8Xoltrq0FSdntj93gg8_tlgdCPs1sX8IUmXuDlrojoVQ9QLZjHLlaeN41Qp_MiMdpQ2C1neDNmt9MWzLGhTG6IiOVbDfeZbT8ip3VFdJ5gjtfB8mQj-9uU6Ear6AraJyfkHXMyT7S-q7BLRg0NQO3d1J_lhzuXOsyTBKlhZOKt0d2LNE5__yhPDr1aL2pU1cGStdoz1seLCZxe7JpdEIkwyWYpBxdOcVXoeUaEY"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-60"></div>
              <div className="absolute bottom-8 left-8">
                <h3 className="font-headline-md text-on-surface text-2xl mb-2 font-light">Private Terraces</h3>
                <p className="font-label-caps text-label-caps text-primary uppercase tracking-widest text-[10px]">Starting from 400 sq.ft</p>
              </div>
            </div>
            <div className="group overflow-hidden relative aspect-[4/5] bg-surface-container-high rounded border border-white/5 mt-0 sm:mt-16">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt="Infinity Oasis Luxury Pool"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr28uHqFUXU1-6oqJKy3H8H0P8wAh2ZOivH0xSDCfso4Y_Xb1gI-e8rBONeD9EF-H27ir1ARdke5aDiY1CvNLqDuihLjYmGKq1MoFG4Gl1LCXLHboR5rnB0LWIZnjPYXI4JBBVc_mHNuqF5FaaqjudHxOFXXErQBlWNhEfyoQXA7iWevn8AMNmdzjSalTnZ775wingAAKF2urxtQ-OSe0_bBOzzpU6HnTu4efJV85W_Y0VFve4ibvEtwe5_Ts1eB1tQxMwTe3wpsY"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-60"></div>
              <div className="absolute bottom-8 left-8">
                <h3 className="font-headline-md text-on-surface text-2xl mb-2 font-light">Infinity Oasis</h3>
                <p className="font-label-caps text-label-caps text-primary uppercase tracking-widest text-[10px]">Level 42 Club</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Inventory & Floor Selector */}
      <section id="inventory" className="py-24 px-6 md:px-margin-desktop bg-surface-container-lowest border-t border-white/5 relative">
        <div className="max-w-container-max mx-auto">
          <div className="text-center mb-16">
            <span className="font-label-caps text-label-caps text-primary mb-2 tracking-widest">LIVE AVAILABILITY</span>
            <h2 className="font-display-xl text-3xl md:text-headline-lg font-light text-on-surface">Interactive Tower Explorer</h2>
            <p className="text-on-surface-variant font-body-md text-sm mt-3 max-w-md mx-auto">Review current availability, pricing models, and layout specs in real-time.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            {/* Tower Selection Menu (Left) */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 tracking-widest">SELECT RESIDENCE TOWER</h3>
              {towers.map((tower) => (
                <div
                  key={tower.name}
                  onClick={() => {
                    setActiveTower(tower.name);
                    const units = inventory[tower.name];
                    if (units && units.length > 0) setFlatSelection(units[0]);
                  }}
                  className={`p-6 border rounded cursor-pointer transition-all duration-500 ${
                    activeTower === tower.name
                      ? 'bg-surface-container border-primary shadow-lg shadow-primary/5'
                      : 'bg-surface/20 border-white/5 hover:border-white/20 hover:bg-surface/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-xl ${activeTower === tower.name ? 'text-primary' : 'text-on-surface/40'}`} data-icon="domain">domain</span>
                    <h4 className={`font-headline-md text-lg ${activeTower === tower.name ? 'text-primary' : 'text-on-surface'}`}>{tower.name}</h4>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2 leading-relaxed font-body-md">{tower.description}</p>
                </div>
              ))}

              {flatSelection && (
                <div className="glass-panel p-6 border-white/10 rounded mt-6 animate-[fadeInUp_0.5s_ease]">
                  <h4 className="font-label-caps text-label-caps text-primary mb-4 tracking-widest">UNIT #{flatSelection.number} SPECIFICATIONS</h4>
                  <div className="space-y-3 text-sm font-body-md">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-on-surface-variant">Configuration</span>
                      <span className="text-on-surface font-semibold">{flatSelection.type}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-on-surface-variant">SBA Size</span>
                      <span className="text-on-surface font-semibold">{flatSelection.size}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-on-surface-variant">Value Model</span>
                      <span className="text-primary font-bold">{flatSelection.price}</span>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-on-surface-variant">Unit Status</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                        flatSelection.status === 'Available' ? 'bg-green-500/15 text-green-400' : flatSelection.status === 'Reserved' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
                      }`}>{flatSelection.status}</span>
                    </div>
                  </div>

                  {flatSelection.status === 'Available' && (
                    <PremiumButton variant="primary" className="w-full mt-6 py-3 tracking-widest text-xs">
                      Reserve Unit
                    </PremiumButton>
                  )}
                </div>
              )}
            </div>

            {/* Inventory Detail Grid (Right) */}
            <div className="lg:col-span-8 bg-surface-container/30 border border-white/5 backdrop-blur-xl p-8 rounded">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-6 tracking-widest">INVENTORY GRID FOR {activeTower.toUpperCase()}</h3>
              
              <div ref={towerGridRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(inventory[activeTower] || []).map((unit) => (
                  <div
                    key={unit.number}
                    onClick={() => setFlatSelection(unit)}
                    className={`p-6 rounded border bg-surface/10 hover:bg-surface/30 transition-all duration-300 cursor-pointer ${
                      flatSelection?.number === unit.number
                        ? 'border-primary shadow-lg shadow-primary/5'
                        : 'border-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-headline-md text-xl text-on-surface">Suite {unit.number}</h4>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider ${
                        unit.status === 'Available' ? 'bg-green-500/10 text-green-400' : unit.status === 'Reserved' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                      }`}>{unit.status}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 text-xs text-on-surface-variant font-body-md">
                      <span>{unit.type}</span>
                      <span>•</span>
                      <span>{unit.size}</span>
                    </div>
                    
                    <div className="flex justify-between items-end mt-6">
                      <span className="text-[10px] text-on-surface/40 font-label-caps uppercase tracking-wider">Invest Model</span>
                      <span className="text-primary font-bold text-lg font-display-xl">{unit.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Aether Reality Walkthrough Section */}
      <section id="virtual-tour" className="py-24 px-6 md:px-margin-desktop bg-surface border-t border-white/5">
        <div className="max-w-container-max mx-auto text-center">
          <span className="font-label-caps text-label-caps text-primary mb-2 tracking-widest">IMMERSE YOURSELF</span>
          <h2 className="font-display-xl text-3xl md:text-headline-lg font-light text-on-surface mb-8">Aether Reality Walkthrough</h2>
          
          <div className="relative aspect-[16/9] w-full max-w-4xl mx-auto rounded overflow-hidden border border-white/10 shadow-2xl group">
            {/* Immersive Walkthrough Video/Image placeholder */}
            <img 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 brightness-50"
              alt="Aether Reality Immersive Walkthrough"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuALub8tldhZ_oMsDBRNKvmeXkewkHSlaNawnWde8Xoltrq0FSdntj93gg8_tlgdCPs1sX8IUmXuDlrojoVQ9QLZjHLlaeN41Qp_MiMdpQ2C1neDNmt9MWzLGhTG6IiOVbDfeZbT8ip3VFdJ5gjtfB8mQj-9uU6Ear6AraJyfkHXMyT7S-q7BLRg0NQO3d1J_lhzuXOsyTBKlhZOKt0d2LNE5__yhPDr1aL2pU1cGStdoz1seLCZxe7JpdEIkwyWYpBxdOcVXoeUaEY"
            />
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/40 z-10">
              <button className="w-20 h-20 rounded-full bg-primary/95 text-on-primary flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-primary transition-all active:scale-95 duration-300">
                <span className="material-symbols-outlined text-4xl" data-icon="play_arrow">play_arrow</span>
              </button>
              <h3 className="font-display-xl text-xl md:text-2xl font-light text-white mt-6">Aether Reality 3D Viewer</h3>
              <p className="text-xs text-white/60 font-body-md mt-2 tracking-widest uppercase">Start real-time virtual floor tour</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant w-full py-gutter px-6 md:px-margin-desktop">
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-label-caps font-label-caps text-on-surface-variant flex flex-col items-center md:items-start gap-4">
            <div className="text-primary text-2xl font-bold font-display-xl">Aethelgard</div>
            <p className="text-xs tracking-wider opacity-60">© 2024 Aethelgard Luxury Real Estate. All rights reserved.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-[11px] font-label-caps">
            <a className="text-on-surface-variant hover:text-primary tracking-widest transition-colors" href="#">Privacy Policy</a>
            <a className="text-on-surface-variant hover:text-primary tracking-widest transition-colors" href="#">Terms of Service</a>
            <a className="text-on-surface-variant hover:text-primary tracking-widest transition-colors" href="#">Builder Portal</a>
            <a className="text-on-surface-variant hover:text-primary tracking-widest transition-colors" href="#">Contact Us</a>
          </div>
          
          <div className="flex gap-4">
            <div className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-full hover:border-primary hover:text-primary transition-all cursor-pointer">
              <span className="material-symbols-outlined text-sm" data-icon="share">share</span>
            </div>
            <div className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-full hover:border-primary hover:text-primary transition-all cursor-pointer">
              <span className="material-symbols-outlined text-sm" data-icon="mail">mail</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
