'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PremiumButton from '@/components/premium-button';
import { gsap } from 'gsap';

interface Flat {
  id: string;
  flatNumber: string;
  type: string;
  sizeSqFt: number;
  price: number;
  status: 'AVAILABLE' | 'BOOKED' | 'HOLD';
  orientation?: string;
  description?: string;
}

interface Floor {
  id: string;
  floorNumber: number;
  flats: Flat[];
}

interface Tower {
  id: string;
  name: string;
  description?: string;
  floors?: Floor[];
}

function HomeViewContent() {
  const searchParams = useSearchParams();
  const builderSlug = searchParams.get('builder') || 'aethelgard';

  const [builderData, setBuilderData] = useState<any>(null);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [activeTowerId, setActiveTowerId] = useState<string>('');
  const [flatSelection, setFlatSelection] = useState<Flat | null>(null);

  // Lead Form States
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const towerGridRef = useRef<HTMLDivElement>(null);

  // Fetch Builder Theme & Details
  useEffect(() => {
    fetch(`http://localhost:3001/builders/theme-by-slug/${builderSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setBuilderData(data);
          // Fetch Live Inventory for the Builder
          fetch(`http://localhost:3001/inventory/towers`, {
            headers: {
              'x-tenant-id': data.id,
            },
          })
            .then((res) => res.json())
            .then((towerData) => {
              if (Array.isArray(towerData) && towerData.length > 0) {
                setTowers(towerData);
                setActiveTowerId(towerData[0].id);
                // Set default selected flat
                const firstFlat = towerData[0].floors?.[0]?.flats?.[0];
                if (firstFlat) setFlatSelection(firstFlat);
              }
            })
            .catch((err) => console.error('Failed to load towers:', err));
        }
      })
      .catch((err) => console.error('Failed to load theme:', err));
  }, [builderSlug]);

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
  }, [activeTowerId]);

  // Handle lead submission
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:3001/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          builderSlug,
        }),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setLeadName('');
        setLeadEmail('');
        setLeadPhone('');
      } else {
        alert('Failed to submit inquiry. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting lead:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const activeTower = towers.find((t) => t.id === activeTowerId);

  // Fallback default variables
  const theme = builderData?.themeSettings || {};
  const themeStyles = {
    '--primary-color': theme.primaryColor || '#d4af37',
    '--secondary-color': theme.secondaryColor || '#131313',
    '--font-header': theme.fontHeader || 'Bodoni Moda',
    '--font-body': theme.fontBody || 'Hanken Grotesk',
  } as React.CSSProperties;

  // Flatten flats from all floors of active tower for display
  const activeTowerFlats: Flat[] = [];
  if (activeTower?.floors) {
    // Sort floors desc to show top floors first
    const sortedFloors = [...activeTower.floors].sort((a, b) => b.floorNumber - a.floorNumber);
    sortedFloors.forEach((floor) => {
      if (floor.flats) {
        activeTowerFlats.push(...floor.flats);
      }
    });
  }

  return (
    <div style={themeStyles} className="min-h-screen bg-neutral-950 text-stone-100 font-sans antialiased">
      {/* Dynamic Font Loader */}
      {theme.fontHeader && (
        <link
          href={`https://fonts.googleapis.com/css2?family=${theme.fontHeader.replace(/\s+/g, '+')}&family=${(theme.fontBody || 'Inter').replace(/\s+/g, '+')}&display=swap`}
          rel="stylesheet"
        />
      )}

      {/* Cinematic Hero Section */}
      <section id="gallery" className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            className="w-full h-full object-cover grayscale-[20%] brightness-[35%] transition-all duration-1000 hover:scale-105" 
            alt="Cinematic Skyscraper Architecture"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 via-transparent to-neutral-950"></div>
        </div>

        {/* Content Area */}
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <p className="font-semibold text-xs text-[var(--primary-color)] mb-6 tracking-[0.3em] uppercase anim-fade-up">
            {builderData?.name || 'RESIDENTIAL EXCELLENCE'}
          </p>
          <h1 className="text-[44px] md:text-6xl leading-tight mb-8 text-stone-100 font-light anim-fade-up" style={{ fontFamily: 'var(--font-header), serif' }}>
            The Pinnacle of <br/><span className="italic font-normal text-[var(--primary-color)]">Luxury Living</span>
          </h1>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center anim-fade-up">
            <PremiumButton variant="primary" onClick={() => {
              const el = document.getElementById('inventory');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}>
              Explore Units
            </PremiumButton>
            <PremiumButton variant="outline" onClick={() => {
              const el = document.getElementById('inquiry');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}>
              Request Showing
            </PremiumButton>
          </div>
        </div>
      </section>

      {/* Concept / Overview */}
      <section id="concept" className="bg-neutral-900 py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase">THE CONCEPT</p>
            <h2 className="text-3xl md:text-4xl text-stone-100 font-light leading-tight" style={{ fontFamily: 'var(--font-header), serif' }}>
              A New Paradigm of <br/><span className="italic font-normal text-[var(--primary-color)]">Architectural Artistry</span>
            </h2>
            <p className="text-stone-400 text-sm leading-relaxed">
              Designed by the visionaries at {builderData?.name || 'Aether'}, this residence is more than a home; it is a meticulously crafted gallery for life. Every slab of marble, every brushed brass fitting, and every panoramic glass pane is curated to provide a sensory experience that redefines urban luxury.
            </p>
          </div>
          
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="group overflow-hidden relative aspect-[4/5] bg-neutral-800 rounded border border-white/5">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt="Private Terraces Penthouse View"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuALub8tldhZ_oMsDBRNKvmeXkewkHSlaNawnWde8Xoltrq0FSdntj93gg8_tlgdCPs1sX8IUmXuDlrojoVQ9QLZjHLlaeN41Qp_MiMdpQ2C1neDNmt9MWzLGhTG6IiOVbDfeZbT8ip3VFdJ5gjtfB8mQj-9uU6Ear6AraJyfkHXMyT7S-q7BLRg0NQO3d1J_lhzuXOsyTBKlhZOKt0d2LNE5__yhPDr1aL2pU1cGStdoz1seLCZxe7JpdEIkwyWYpBxdOcVXoeUaEY"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent opacity-60"></div>
              <div className="absolute bottom-8 left-8">
                <h3 className="text-stone-100 text-xl font-light">Private Terraces</h3>
                <p className="text-[var(--primary-color)] uppercase tracking-widest text-[9px] font-bold">Luxury Sky Suites</p>
              </div>
            </div>
            <div className="group overflow-hidden relative aspect-[4/5] bg-neutral-800 rounded border border-white/5 mt-0 sm:mt-16">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt="Infinity Oasis Luxury Pool"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr28uHqFUXU1-6oqJKy3H8H0P8wAh2ZOivH0xSDCfso4Y_Xb1gI-e8rBONeD9EF-H27ir1ARdke5aDiY1CvNLqDuihLjYmGKq1MoFG4Gl1LCXLHboR5rnB0LWIZnjPYXI4JBBVc_mHNuqF5FaaqjudHxOFXXErQBlWNhEfyoQXA7iWevn8AMNmdzjSalTnZ775wingAAKF2urxtQ-OSe0_bBOzzpU6HnTu4efJV85W_Y0VFve4ibvEtwe5_Ts1eB1tQxMwTe3wpsY"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent opacity-60"></div>
              <div className="absolute bottom-8 left-8">
                <h3 className="text-stone-100 text-xl font-light">Infinity Oasis</h3>
                <p className="text-[var(--primary-color)] uppercase tracking-widest text-[9px] font-bold">Panoramic Rooftop Pool</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Inventory */}
      <section id="inventory" className="py-24 px-6 bg-neutral-950 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-2">LIVE AVAILABILITY</span>
            <h2 className="text-3xl md:text-4xl font-light text-stone-100" style={{ fontFamily: 'var(--font-header), serif' }}>Interactive Tower Explorer</h2>
            <p className="text-stone-400 text-sm mt-3 max-w-md mx-auto">Review current availability, pricing models, and layout specs in real-time.</p>
          </div>

          {towers.length === 0 ? (
            <p className="text-stone-400 text-center py-10 text-xs">No tower units synchronized currently.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Towers list */}
              <div className="lg:col-span-4 space-y-4">
                <h3 className="text-xs font-bold text-stone-400 tracking-widest uppercase mb-4">SELECT RESIDENCE TOWER</h3>
                {towers.map((tower) => (
                  <div
                    key={tower.id}
                    onClick={() => {
                      setActiveTowerId(tower.id);
                      const firstFlat = tower.floors?.[0]?.flats?.[0];
                      if (firstFlat) setFlatSelection(firstFlat);
                    }}
                    className={`p-6 border rounded cursor-pointer transition-all duration-300 ${
                      activeTowerId === tower.id
                        ? 'bg-neutral-900 border-[var(--primary-color)]'
                        : 'bg-neutral-900/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <h4 className={`text-lg font-medium ${activeTowerId === tower.id ? 'text-[var(--primary-color)]' : 'text-stone-100'}`} style={{ fontFamily: 'var(--font-header), serif' }}>
                      {tower.name}
                    </h4>
                    <p className="text-xs text-stone-400 mt-2 leading-relaxed">{tower.description || 'Luxury residence unit.'}</p>
                  </div>
                ))}

                {flatSelection && (
                  <div className="bg-neutral-900/60 border border-white/10 p-6 rounded-2xl mt-6">
                    <h4 className="text-xs font-bold text-[var(--primary-color)] mb-4 tracking-widest uppercase">UNIT #{flatSelection.flatNumber} SPECIFICATIONS</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-stone-400">Configuration</span>
                        <span className="text-stone-100 font-semibold">{flatSelection.type}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-stone-400">SBA Size</span>
                        <span className="text-stone-100 font-semibold">{flatSelection.sizeSqFt} sqft</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-stone-400">Value Model</span>
                        <span className="text-[var(--primary-color)] font-bold">₹{(flatSelection.price / 10000000).toFixed(2)} Cr</span>
                      </div>
                      {flatSelection.orientation && (
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-stone-400">Orientation</span>
                          <span className="text-stone-100 font-semibold">{flatSelection.orientation}</span>
                        </div>
                      )}
                      <div className="flex justify-between pb-2">
                        <span className="text-stone-400">Unit Status</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[9px] uppercase ${
                          flatSelection.status === 'AVAILABLE' ? 'bg-green-500/15 text-green-400' : flatSelection.status === 'HOLD' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
                        }`}>{flatSelection.status}</span>
                      </div>
                    </div>

                    {flatSelection.status === 'AVAILABLE' && (
                      <button 
                        onClick={() => {
                          const el = document.getElementById('inquiry');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full mt-6 py-3 bg-[var(--primary-color)] hover:opacity-90 text-neutral-950 font-bold text-xs rounded-xl tracking-wider uppercase transition-all"
                      >
                        Request Private Tour
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Flats list */}
              <div className="lg:col-span-8 bg-neutral-900/30 border border-white/5 p-8 rounded-2xl">
                <h3 className="text-xs font-bold text-stone-400 tracking-widest uppercase mb-6">INVENTORY GRID FOR {activeTower?.name.toUpperCase()}</h3>
                
                <div ref={towerGridRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeTowerFlats.length === 0 ? (
                    <p className="text-stone-400 col-span-2 text-center py-10 text-xs">No flats available in this tower.</p>
                  ) : (
                    activeTowerFlats.map((unit) => (
                      <div
                        key={unit.id}
                        onClick={() => setFlatSelection(unit)}
                        className={`p-6 rounded-2xl border bg-neutral-900/20 hover:bg-neutral-900/50 transition-all duration-300 cursor-pointer ${
                          flatSelection?.id === unit.id
                            ? 'border-[var(--primary-color)]'
                            : 'border-white/5'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg text-stone-100 font-medium" style={{ fontFamily: 'var(--font-header), serif' }}>Suite {unit.flatNumber}</h4>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-wider ${
                            unit.status === 'AVAILABLE' ? 'bg-green-500/10 text-green-400' : unit.status === 'HOLD' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                          }`}>{unit.status}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-4 text-xs text-stone-400">
                          <span>{unit.type}</span>
                          <span>•</span>
                          <span>{unit.sizeSqFt} sqft</span>
                        </div>
                        
                        <div className="flex justify-between items-end mt-6">
                          <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Invest Model</span>
                          <span className="text-[var(--primary-color)] font-bold text-lg font-serif">₹{(unit.price / 10000000).toFixed(2)} Cr</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Inquiry Form Section */}
      <section id="inquiry" className="py-24 px-6 bg-neutral-900 border-t border-white/5">
        <div className="max-w-md mx-auto bg-neutral-950/60 border border-white/5 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase">REQUEST PRIVACY EXCELLENCE</span>
            <h3 className="text-2xl text-stone-100 font-light mt-2" style={{ fontFamily: 'var(--font-header), serif' }}>Schedule Private Viewing</h3>
            <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">Submit your details to experience Aether Reality firsthand.</p>
          </div>

          {submitSuccess ? (
            <div className="p-6 bg-green-950/30 border border-green-500/20 text-green-400 rounded-2xl text-xs font-semibold text-center animate-pulse">
              🎉 Thank you! Our executive will contact you shortly to coordinate your private tour.
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 bg-neutral-950 border border-white/10 focus:border-[var(--primary-color)] focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="e.g. john@domain.com"
                  className="w-full px-4 py-3 bg-neutral-950 border border-white/10 focus:border-[var(--primary-color)] focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="e.g. +91 99999 88888"
                  className="w-full px-4 py-3 bg-neutral-950 border border-white/10 focus:border-[var(--primary-color)] focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 mt-2 bg-[var(--primary-color)] hover:opacity-90 text-neutral-950 font-bold text-xs rounded-xl tracking-wider uppercase transition-all duration-300 disabled:opacity-50"
              >
                {submitting ? 'Submitting Inquiry...' : 'Submit Inquiry'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-neutral-950 border-t border-white/5 w-full py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="text-[var(--primary-color)] text-2xl font-bold font-serif" style={{ fontFamily: 'var(--font-header), serif' }}>
              {builderData?.name || 'Aether'}
            </div>
            <p className="text-xs text-stone-500">© 2026 {builderData?.name || 'Aether'} Luxury Real Estate. All rights reserved.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-[11px] font-bold tracking-widest uppercase">
            <a className="text-stone-400 hover:text-[var(--primary-color)] transition-colors" href="#">Privacy Policy</a>
            <a className="text-stone-400 hover:text-[var(--primary-color)] transition-colors" href="#">Terms of Service</a>
            <a className="text-stone-400 hover:text-[var(--primary-color)] transition-colors" href="#">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomeView() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-stone-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
          <p className="text-xs font-bold text-stone-500 tracking-wider uppercase">Loading Premium Experience...</p>
        </div>
      </div>
    }>
      <HomeViewContent />
    </Suspense>
  );
}
