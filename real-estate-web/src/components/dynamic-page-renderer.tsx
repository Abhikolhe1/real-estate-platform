'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import PremiumButton from '@/components/premium-button';
import { Icon } from '@iconify/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger client-side
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Section {
  id: string;
  type: string;
  orderNo: number;
  configJson: any;
}

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

export default function DynamicPageRenderer({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const builderSlug = searchParams.get('builder') || 'aethelgard';

  const [builderData, setBuilderData] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // Lead Form States
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tower Inventory States
  const [towers, setTowers] = useState<Tower[]>([]);
  const [activeTowerId, setActiveTowerId] = useState<string>('');
  const [flatSelection, setFlatSelection] = useState<Flat | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch builder theme settings
        const themeRes = await fetch(`http://localhost:3001/builders/theme-by-slug/${builderSlug}`);
        const themeData = await themeRes.json();
        if (themeData && themeData.id) {
          setBuilderData(themeData);

          // 2. Fetch page layout sections
          const pageRes = await fetch(`http://localhost:3001/pages/by-slug/${slug}?builderSlug=${builderSlug}`);
          const pageData = await pageRes.json();
          if (pageData) {
            setSections(pageData.websiteSections || []);
          }

          // 3. Fetch towers if inventory sections are needed
          const towerRes = await fetch(`http://localhost:3001/inventory/towers`, {
            headers: { 'x-tenant-id': themeData.id },
          });
          if (towerRes.ok) {
            const towerData = await towerRes.json();
            if (Array.isArray(towerData) && towerData.length > 0) {
              setTowers(towerData);
              setActiveTowerId(towerData[0].id);
              const firstFlat = towerData[0].floors?.[0]?.flats?.[0];
              if (firstFlat) setFlatSelection(firstFlat);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load page renderer:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, builderSlug]);

  // Apply GSAP Animations based on settings
  useEffect(() => {
    if (loading || !containerRef.current) return;

    // Reset ScrollTrigger
    ScrollTrigger.getAll().forEach((t) => t.kill());

    const children = containerRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const sectionEl = children[i] as HTMLElement;
      const animationType = sectionEl.getAttribute('data-animation');
      const duration = parseFloat(sectionEl.getAttribute('data-duration') || '1.2');
      const delay = parseFloat(sectionEl.getAttribute('data-delay') || '0.1');

      if (!animationType || animationType === 'none') continue;

      let fromProps: gsap.TweenVars = { opacity: 0 };
      let toProps: gsap.TweenVars = {
        opacity: 1,
        duration,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionEl,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      };

      if (animationType === 'fade-up') {
        fromProps.y = 50;
        toProps.y = 0;
      } else if (animationType === 'fade-down') {
        fromProps.y = -50;
        toProps.y = 0;
      } else if (animationType === 'fade-left') {
        fromProps.x = 50;
        toProps.x = 0;
      } else if (animationType === 'fade-right') {
        fromProps.x = -50;
        toProps.x = 0;
      } else if (animationType === 'zoom') {
        fromProps.scale = 0.85;
        toProps.scale = 1;
      } else if (animationType === 'scale') {
        fromProps.scale = 0.95;
        toProps.scale = 1;
      }

      gsap.fromTo(sectionEl, fromProps, toProps);
    }
  }, [loading, sections]);

  // Handle lead submission
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:3001/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-stone-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
          <p className="text-xs font-bold text-stone-500 tracking-wider uppercase">Loading Premium Experience...</p>
        </div>
      </div>
    );
  }

  const theme = builderData?.themeSettings || {};
  const themeStyles = {
    '--primary-color': theme.primaryColor || '#d4af37',
    '--secondary-color': theme.secondaryColor || '#131313',
    '--font-header': theme.fontHeader || 'Bodoni Moda',
    '--font-body': theme.fontBody || 'Hanken Grotesk',
  } as React.CSSProperties;

  const btnStyleClass = (variant: 'primary' | 'outline') => {
    const radius = theme.buttonStyle === 'pill' ? 'rounded-full' : theme.buttonStyle === 'rounded' ? 'rounded-xl' : 'rounded-none';
    if (variant === 'primary') {
      return `px-7 py-3.5 bg-[var(--primary-color)] text-neutral-950 font-bold text-xs tracking-wider uppercase ${radius} hover:opacity-90 transition-all shadow-md`;
    }
    return `px-7 py-3.5 bg-transparent text-stone-200 border border-stone-200/40 font-bold text-xs tracking-wider uppercase ${radius} hover:bg-white/5 hover:border-stone-200 transition-all`;
  };

  const cardStyleClass = () => {
    const radius = theme.buttonStyle === 'pill' ? 'rounded-3xl' : theme.buttonStyle === 'rounded' ? 'rounded-2xl' : 'rounded-none';
    if (theme.cardStyle === 'shadow') {
      return `bg-neutral-900 border border-white/5 shadow-2xl ${radius}`;
    }
    if (theme.cardStyle === 'flat') {
      return `bg-neutral-900 border-none ${radius}`;
    }
    return `bg-white/5 border border-white/10 backdrop-blur-md ${radius}`; // glass
  };

  // Render individual section markup based on its type
  const renderSection = (sec: Section, index: number) => {
    const config = sec.configJson || {};
    const anim = config.animation || 'none';
    const dur = config.duration !== undefined ? config.duration : 1.2;
    const del = config.delay !== undefined ? config.delay : 0.1;

    switch (sec.type) {
      case 'hero':
        return (
          <section
            key={sec.id}
            data-animation={anim}
            data-duration={dur}
            data-delay={del}
            className="relative h-screen w-full flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 z-0">
              <img
                className="w-full h-full object-cover grayscale-[20%] brightness-[35%] transition-all duration-1000 hover:scale-105"
                alt="Landscape View"
                src={config.backgroundImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E'}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 via-transparent to-neutral-950"></div>
            </div>
            <div className="relative z-10 text-center px-6 max-w-5xl">
              <p className="font-semibold text-xs text-[var(--primary-color)] mb-6 tracking-[0.3em] uppercase">
                {builderData?.name || 'EXCLUSIVE LIVING'}
              </p>
              <h1 className="text-[44px] md:text-6xl leading-tight mb-8 text-stone-100 font-light" style={{ fontFamily: 'var(--font-header), serif' }}>
                {config.title || 'Architectural Landmark'}<br />
                <span className="italic font-normal text-[var(--primary-color)]">{config.subtitle || 'Signature Quality'}</span>
              </h1>
              {config.buttonText && (
                <div className="flex gap-4 justify-center">
                  <a href={config.buttonUrl || '#inquiry'} className={btnStyleClass('primary')}>
                    {config.buttonText}
                  </a>
                </div>
              )}
            </div>
          </section>
        );

      case 'features':
        return (
          <section
            key={sec.id}
            data-animation={anim}
            data-duration={dur}
            data-delay={del}
            className="bg-neutral-900 py-24 px-6 border-t border-white/5"
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 space-y-6">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase block">
                  {config.title || 'THE CONCEPT'}
                </span>
                <h2 className="text-3xl md:text-4xl text-stone-100 font-light leading-tight" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.subtitle || 'A Paradigm of Artistry'}
                </h2>
                <p className="text-stone-400 text-sm leading-relaxed">
                  {config.description || 'Crafted with passion, designed to bridge structure with environmental design.'}
                </p>
              </div>
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
                {(config.features || []).map((feat: any, idx: number) => (
                  <div
                    key={idx}
                    className={`group overflow-hidden relative aspect-[4/5] ${cardStyleClass()} ${idx === 1 ? 'mt-0 sm:mt-16' : ''}`}
                  >
                    <img
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={feat.title}
                      src={feat.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuALub8tldhZ_oMsDBRNKvmeXkewkHSlaNawnWde8Xoltrq0FSdntj93gg8_tlgdCPs1sX8IUmXuDlrojoVQ9QLZjHLlaeN41Qp_MiMdpQ2C1neDNmt9MWzLGhTG6IiOVbDfeZbT8ip3VFdJ5gjtfB8mQj-9uU6Ear6AraJyfkHXMyT7S-q7BLRg0NQO3d1J_lhzuXOsyTBKlhZOKt0d2LNE5__yhPDr1aL2pU1cGStdoz1seLCZxe7JpdEIkwyWYpBxdOcVXoeUaEY'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent opacity-60"></div>
                    <div className="absolute bottom-8 left-8">
                      <h3 className="text-stone-100 text-xl font-light">{feat.title}</h3>
                      <p className="text-[var(--primary-color)] uppercase tracking-widest text-[9px] font-bold mt-1">
                        {feat.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'gallery':
        const galleryImages = config.images || [];
        return (
          <section
            key={sec.id}
            data-animation={anim}
            data-duration={dur}
            data-delay={del}
            className="bg-neutral-950 py-24 px-6 border-t border-white/5"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-2">
                  {config.title || 'PORTFOLIO'}
                </span>
                <h2 className="text-3xl md:text-4xl font-light text-stone-100" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.subtitle || 'Cinematic Photo Gallery'}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryImages.map((imgUrl: string, idx: number) => (
                  <div key={idx} className={`overflow-hidden aspect-video ${cardStyleClass()}`}>
                    <img
                      className="w-full h-full object-cover hover:scale-105 transition-all duration-700"
                      src={imgUrl}
                      alt={`Gallery Item ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'amenities':
        const ams = config.amenities || [];
        return (
          <section
            key={sec.id}
            data-animation={anim}
            data-duration={dur}
            data-delay={del}
            className="bg-neutral-900 py-24 px-6 border-t border-white/5"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-2">
                  {config.title || 'AMENITIES'}
                </span>
                <h2 className="text-3xl md:text-4xl font-light text-stone-100" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.subtitle || 'Designed for Comfort'}
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                {ams.map((amenity: string, idx: number) => (
                  <div key={idx} className={`p-8 flex flex-col justify-between h-36 ${cardStyleClass()}`}>
                    <Icon icon="solar:check-circle-bold-duotone" width="32" className="text-[var(--primary-color)]" />
                    <span className="font-bold text-stone-100 tracking-wide text-sm">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta':
        return (
          <section
            key={sec.id}
            data-animation={anim}
            data-duration={dur}
            data-delay={del}
            className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 py-24 px-6 border-t border-white/5 text-center"
          >
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl text-stone-100 font-light" style={{ fontFamily: 'var(--font-header), serif' }}>
                {config.title || 'Ready to Own Architectural Masterpieces?'}
              </h2>
              <p className="text-stone-400 text-sm leading-relaxed">
                {config.subtitle || 'Book a private tour with our relationship manager and experience luxury first-hand.'}
              </p>
              {config.buttonText && (
                <div className="pt-4">
                  <a href={config.buttonUrl || '#inquiry'} className={btnStyleClass('primary')}>
                    {config.buttonText}
                  </a>
                </div>
              )}
            </div>
          </section>
        );

      case 'contact':
        return (
          <section
            key={sec.id}
            data-animation={anim}
            data-duration={dur}
            data-delay={del}
            id="inquiry"
            className="py-24 px-6 bg-neutral-900 border-t border-white/5"
          >
            <div className="max-w-md mx-auto bg-neutral-950 border border-white/5 rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase">
                  INQUIRE DETAILS
                </span>
                <h3 className="text-2xl text-stone-100 font-light mt-2" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.title || 'Schedule Private Tour'}
                </h3>
                <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                  {config.subtitle || 'Please provide your details below.'}
                </p>
              </div>

              {submitSuccess ? (
                <div className="p-6 bg-green-950/30 border border-green-500/20 text-green-400 rounded-2xl text-xs font-semibold text-center">
                  🎉 Inquiry received! Our executive will contact you shortly.
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
                    {submitting ? 'Submitting...' : config.buttonText || 'Submit Inquiry'}
                  </button>
                </form>
              )}
            </div>
          </section>
        );

      case 'video':
        return (
          <section
            key={sec.id}
            data-animation={anim}
            data-duration={dur}
            data-delay={del}
            className="bg-neutral-950 py-24 px-6 border-t border-white/5"
          >
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-stone-100 font-light leading-tight" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.title || 'Walkthrough Tour'}
                </h3>
                <p className="text-stone-400 text-xs mt-2">{config.subtitle}</p>
              </div>
              {config.videoUrl ? (
                <div className="overflow-hidden rounded-3xl border border-white/10 aspect-video">
                  <video src={config.videoUrl} controls className="w-full h-full object-cover" />
                </div>
              ) : (
                <p className="text-center text-xs text-stone-500 italic">No Walkthrough video URL configured.</p>
              )}
            </div>
          </section>
        );

      case 'virtual-tour':
        return (
          <section
            key={sec.id}
            data-animation={anim}
            data-duration={dur}
            data-delay={del}
            className="bg-neutral-900 py-24 px-6 border-t border-white/5"
          >
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-stone-100 font-light leading-tight" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.title || 'Virtual 3D Walkthrough'}
                </h3>
                <p className="text-stone-400 text-xs mt-2">{config.subtitle}</p>
              </div>
              {config.tourUrl ? (
                <div className="overflow-hidden rounded-3xl border border-white/15 aspect-video h-[500px] bg-neutral-950">
                  <iframe src={config.tourUrl} className="w-full h-full border-none" allowFullScreen />
                </div>
              ) : (
                <div className="p-20 text-center border border-dashed border-white/10 rounded-3xl">
                  <Icon icon="solar:globus-bold-duotone" width="48" className="text-stone-500 mx-auto" />
                  <p className="text-xs text-stone-400 mt-4 italic">No virtual tour frames linked currently.</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'inventory':
        // Flatten flats from active tower for display
        const activeTower = towers.find((t) => t.id === activeTowerId);
        const activeTowerFlats: Flat[] = [];
        if (activeTower?.floors) {
          const sortedFloors = [...activeTower.floors].sort((a, b) => b.floorNumber - a.floorNumber);
          sortedFloors.forEach((floor) => {
            if (floor.flats) activeTowerFlats.push(...floor.flats);
          });
        }

        return (
          <section
            key={sec.id}
            data-animation={anim}
            data-duration={dur}
            data-delay={del}
            id="inventory"
            className="py-24 px-6 bg-neutral-950 border-t border-white/5 relative"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-2">
                  LIVE AVAILABILITY
                </span>
                <h2 className="text-3xl md:text-4xl font-light text-stone-100" style={{ fontFamily: 'var(--font-header), serif' }}>
                  Interactive Unit Inventory
                </h2>
              </div>

              {towers.length === 0 ? (
                <p className="text-stone-400 text-center py-10 text-xs">No tower units synchronized currently.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
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
                      <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl mt-6">
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
                            className={btnStyleClass('primary') + ' w-full mt-6'}
                          >
                            Request Private Tour
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-8 bg-neutral-900/30 border border-white/5 p-8 rounded-2xl">
                    <h3 className="text-xs font-bold text-stone-400 tracking-widest uppercase mb-6">INVENTORY GRID</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {activeTowerFlats.map((unit) => (
                        <div
                          key={unit.id}
                          onClick={() => setFlatSelection(unit)}
                          className={`p-6 rounded-2xl border bg-neutral-900/20 hover:bg-neutral-900/50 transition-all duration-300 cursor-pointer ${
                            flatSelection?.id === unit.id ? 'border-[var(--primary-color)]' : 'border-white/5'
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
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div style={themeStyles} className="min-h-screen bg-neutral-950 text-stone-100 font-sans antialiased">
      {/* Dynamic Font Loader */}
      {theme.fontHeader && (
        <link
          href={`https://fonts.googleapis.com/css2?family=${theme.fontHeader.replace(/\s+/g, '+')}&family=${(theme.fontBody || 'Inter').replace(/\s+/g, '+')}&display=swap`}
          rel="stylesheet"
        />
      )}

      <div ref={containerRef} className="flex flex-col w-full">
        {sections.map((sec, index) => renderSection(sec, index))}
      </div>
    </div>
  );
}
