'use client';

import { API_URL, getAssetUrl } from '@/config/api';
import Link from 'next/link';
import { builderUrl, getBuilder, publicJson } from '@/lib/public-data';
import { PageSkeleton } from './page-skeleton';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';


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
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [submitError, setSubmitError] = useState('');

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
    let active = true;
    setLoading(true); setLoadError(''); setBuilderData(null); setSections([]); setTowers([]); setFlatSelection(null);
    (async () => {
      try {
        const builder = await getBuilder(builderSlug);
        if (!builder?.id) throw new Error('This builder could not be found.');
        const page = await publicJson('/pages/by-slug/' + encodeURIComponent(slug) + '?builderSlug=' + encodeURIComponent(builderSlug), builder.id);
        if (!active) return;
        const nextSections = Array.isArray(page?.websiteSections) ? page.websiteSections : [];
        setBuilderData(builder); setSections(nextSections);
        if (nextSections.some((section: Section) => section.type === 'inventory')) {
          const data = await publicJson('/inventory/towers', builder.id);
          if (!active) return;
          if (!Array.isArray(data)) throw new Error('Inventory could not be loaded.');
          setTowers(data); setActiveTowerId(data[0]?.id || '');
          setFlatSelection(data[0]?.floors?.flatMap((floor: Floor) => floor.flats || [])[0] || null);
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'This page could not load.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [slug, builderSlug, retry]);

  // Reveal sections without blocking the first visible content on an animation library.
  useEffect(() => {
    if (loading || !containerRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        const kind = element.dataset.animation;
        if (!kind || kind === 'none') continue;
        const transform: Record<string, string> = { 'fade-up': 'translateY(16px)', 'fade-down': 'translateY(-16px)', 'fade-left': 'translateX(16px)', 'fade-right': 'translateX(-16px)', zoom: 'scale(.98)', scale: 'scale(.98)' };
        animations.push(element.animate([{opacity: 0, transform: transform[kind] || 'none'}, {opacity: 1, transform: 'none'}], {
          duration: Math.min(.8, Math.max(.2, Number(element.dataset.duration) || .6)) * 1000,
          easing: 'cubic-bezier(.22, 1, .36, 1)',
        }));
      }
    }, {threshold: .08});
    Array.from(containerRef.current.children).slice(1).forEach(element => observer.observe(element));
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [loading, sections]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setSubmitError('');
    try {
      const response = await fetch(`${API_URL}/leads`, {
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
        setSubmitError('Failed to submit inquiry. Please try again.');
      }
    } catch (err) {
      setSubmitError('Unable to reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton label="Loading property page" />;
  if (loadError) return <div role="alert" className="mx-auto max-w-lg px-6 py-20 text-center"><h1 className="text-2xl">Unable to load this page</h1><p className="my-4 text-on-surface-variant">{loadError}</p><button onClick={() => setRetry(value => value + 1)} className="rounded-lg border border-warm-taupe px-5 py-3">Try again</button></div>;
  if (!sections.length) return <div className="px-6 py-20 text-center"><h1 className="text-2xl">This page is not published yet</h1><Link href={builderUrl('/explorer', builderSlug)} className="mt-5 inline-block text-primary underline">Explore the property in 3D</Link></div>;

  const theme = builderData?.themeSettings || {};
  const themeStyles = {
    '--primary-color': '#3A2E29',
    '--secondary-color': '#F1EDE7',
    '--font-header': theme.fontHeader || 'Bodoni Moda',
    '--font-body': theme.fontBody || 'Hanken Grotesk',
  } as React.CSSProperties;

  const btnStyleClass = (variant: 'primary' | 'outline') => {
    const radius = theme.buttonStyle === 'pill' ? 'rounded-full' : theme.buttonStyle === 'rounded' ? 'rounded-xl' : 'rounded-none';
    if (variant === 'primary') {
      return `px-8 py-4 bg-primary text-on-primary font-bold text-[10px] tracking-[0.2em] uppercase ${radius} hover:opacity-90 transition-colors shadow-[0_8px_24px_-12px_rgba(58,46,41,0.18)] motion-safe:active:scale-[0.99] flex items-center justify-center gap-2`;
    }
    return `px-8 py-4 bg-transparent text-on-surface border border-warm-taupe/60 font-bold text-[10px] tracking-[0.2em] uppercase ${radius} hover:bg-warm-linen hover:border-warm-taupe transition-colors motion-safe:active:scale-[0.99] flex items-center justify-center gap-2`;
  };

  const cardStyleClass = () => {
    const radius = theme.buttonStyle === 'pill' ? 'rounded-3xl' : theme.buttonStyle === 'rounded' ? 'rounded-2xl' : 'rounded-none';
    if (theme.cardStyle === 'shadow') {
      return `bg-surface-container border border-outline-variant/70 shadow-[0_16px_48px_-24px_rgba(58,46,41,0.22)] ${radius}`;
    }
    if (theme.cardStyle === 'flat') {
      return `bg-surface-container border-none ${radius}`;
    }
    return `bg-warm-cream/80 border border-outline-variant ${radius}`;
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
            className="relative min-h-[540px] h-[calc(100svh-80px)] max-h-[960px] w-full flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 z-0">
              <img
                fetchPriority={index === 0 ? 'high' : 'auto'}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="w-full h-full object-cover brightness-[80%]"
                alt="Landscape View"
                src={config.backgroundImage || getAssetUrl('/images/hero-skyline.jpg')}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-warm-brown/25 via-warm-brown/20 to-warm-brown/75"></div>
            </div>
            <div className="relative z-10 text-center px-6 max-w-5xl [--primary-color:#CAAD8E]">
              <p className="font-semibold text-xs text-[var(--primary-color)] mb-6 tracking-[0.3em] uppercase">
                {builderData?.name || 'EXCLUSIVE LIVING'}
              </p>
              <h1 className="text-[44px] md:text-6xl leading-tight mb-8 text-warm-cream font-light" style={{ fontFamily: 'var(--font-header), serif' }}>
                {config.title || 'Architectural Landmark'}<br />
                <span className="italic font-normal text-[var(--primary-color)]">{config.subtitle || 'Signature Quality'}</span>
              </h1>
              {config.buttonText && (
                <div className="flex gap-4 justify-center">
                  <Link href={builderUrl(config.buttonUrl || '/contact', builderSlug)} className={btnStyleClass('primary')}>
                    {config.buttonText}
                  </Link>
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
            className="bg-surface-container py-24 px-6 border-t border-outline-variant/70"
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 space-y-6">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase block">
                  {config.title || 'THE CONCEPT'}
                </span>
                <h2 className="text-3xl md:text-4xl text-on-surface font-light leading-tight" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.subtitle || 'A Paradigm of Artistry'}
                </h2>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {config.description || 'Crafted with passion, designed to bridge structure with environmental design.'}
                </p>
              </div>
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
                {(config.features || []).map((feat: any, idx: number) => (
                  <div
                    key={idx}
                    className={`group overflow-hidden relative aspect-[4/5] ${cardStyleClass()} ${idx === 1 ? 'mt-0 sm:mt-16' : ''}`}
                  >
                    <img loading="lazy" decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.035]"
                      alt={feat.title}
                      src={feat.image || (idx === 0 ? getAssetUrl('/images/suite-terrace.jpg') : getAssetUrl('/images/infinity-pool.jpg'))}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-warm-brown/90 to-transparent opacity-60"></div>
                    <div className="absolute bottom-8 left-8 [--primary-color:#CAAD8E]">
                      <h3 className="text-warm-cream text-xl font-light">{feat.title}</h3>
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
            className="bg-background py-24 px-6 border-t border-outline-variant/70"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-2">
                  {config.title || 'PORTFOLIO'}
                </span>
                <h2 className="text-3xl md:text-4xl font-light text-on-surface" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.subtitle || 'Cinematic Photo Gallery'}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryImages.map((imgUrl: string, idx: number) => (
                  <div key={idx} className={`overflow-hidden aspect-video ${cardStyleClass()}`}>
                    <img loading="lazy" decoding="async"
                      className="w-full h-full object-cover motion-safe:hover:scale-[1.025] transition-transform duration-700"
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
            className="bg-surface-container py-24 px-6 border-t border-outline-variant/70"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-2">
                  {config.title || 'AMENITIES'}
                </span>
                <h2 className="text-3xl md:text-4xl font-light text-on-surface" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.subtitle || 'Designed for Comfort'}
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                {ams.map((amenity: string, idx: number) => (
                  <div key={idx} className={`p-8 flex flex-col justify-between h-36 ${cardStyleClass()}`}>
                    <Icon icon="solar:check-circle-bold-duotone" width="32" className="text-[var(--primary-color)]" />
                    <span className="font-bold text-on-surface tracking-wide text-sm">{amenity}</span>
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
            className="bg-gradient-to-r from-warm-linen via-warm-cream to-warm-linen py-24 px-6 border-t border-outline-variant/70 text-center"
          >
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl text-on-surface font-light" style={{ fontFamily: 'var(--font-header), serif' }}>
                {config.title || 'Ready to Own Architectural Masterpieces?'}
              </h2>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {config.subtitle || 'Book a private tour with our relationship manager and experience luxury first-hand.'}
              </p>
              {config.buttonText && (
                <div className="pt-4">
                  <Link href={builderUrl(config.buttonUrl || '/contact', builderSlug)} className={btnStyleClass('primary')}>
                    {config.buttonText}
                  </Link>
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
            className="py-24 px-6 bg-surface-container border-t border-outline-variant/70"
          >
            <div className="max-w-md mx-auto bg-background border border-outline-variant/70 rounded-3xl p-8 shadow-[0_16px_48px_-24px_rgba(58,46,41,0.22)]">
              <div className="text-center mb-8">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase">
                  INQUIRE DETAILS
                </span>
                <h3 className="text-2xl text-on-surface font-light mt-2" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.title || 'Schedule Private Tour'}
                </h3>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">
                  {config.subtitle || 'Please provide your details below.'}
                </p>
              </div>

              {submitSuccess ? (
                <div className="p-6 bg-emerald-50 border border-green-500/20 text-emerald-800 rounded-2xl text-xs font-semibold text-center">
                  🎉 Inquiry received! Our executive will contact you shortly.
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3 bg-background border border-outline-variant focus:border-[var(--primary-color)] focus:outline-none text-on-surface rounded-xl text-xs transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="e.g. john@domain.com"
                      className="w-full px-4 py-3 bg-background border border-outline-variant focus:border-[var(--primary-color)] focus:outline-none text-on-surface rounded-xl text-xs transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="e.g. +91 99999 88888"
                      className="w-full px-4 py-3 bg-background border border-outline-variant focus:border-[var(--primary-color)] focus:outline-none text-on-surface rounded-xl text-xs transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 mt-2 bg-primary hover:opacity-90 text-on-primary font-bold text-[10px] tracking-[0.2em] rounded-xl uppercase transition-colors duration-300 motion-safe:active:scale-[0.99] disabled:opacity-50 shadow-[0_8px_24px_-12px_rgba(58,46,41,0.18)]"
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
            className="bg-background py-24 px-6 border-t border-outline-variant/70"
          >
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-on-surface font-light leading-tight" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.title || 'Walkthrough Tour'}
                </h3>
                <p className="text-on-surface-variant text-xs mt-2">{config.subtitle}</p>
              </div>
              <div className="overflow-hidden rounded-3xl border border-outline-variant aspect-video shadow-[0_16px_48px_-24px_rgba(58,46,41,0.22)] bg-background">
                <video
                  src={config.videoUrl || getAssetUrl('/videos/walkthrough.mp4')}
                  controls
                  preload="none"
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
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
            className="bg-surface-container py-24 px-6 border-t border-outline-variant/70"
          >
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-on-surface font-light leading-tight" style={{ fontFamily: 'var(--font-header), serif' }}>
                  {config.title || 'Virtual 3D Walkthrough'}
                </h3>
                <p className="text-on-surface-variant text-xs mt-2">{config.subtitle}</p>
              </div>
              {config.tourUrl ? (
                <div className="overflow-hidden rounded-3xl border border-outline-variant h-[360px] sm:h-[500px] bg-background">
                  <iframe title={config.title || 'Property virtual tour'} loading="lazy" src={config.tourUrl} className="w-full h-full border-none" allowFullScreen />
                </div>
              ) : (
                <div className="p-20 text-center border border-dashed border-outline-variant rounded-3xl">
                  <Icon icon="solar:globus-bold-duotone" width="48" className="text-on-surface-variant mx-auto" />
                  <p className="text-xs text-on-surface-variant mt-4 italic">No virtual tour frames linked currently.</p>
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
            className="py-24 px-6 bg-background border-t border-outline-variant/70 relative"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest uppercase block mb-2">
                  LIVE AVAILABILITY
                </span>
                <h2 className="text-3xl md:text-4xl font-light text-on-surface" style={{ fontFamily: 'var(--font-header), serif' }}>
                  Interactive Unit Inventory
                </h2>
              </div>

              {towers.length === 0 ? (
                <p className="text-on-surface-variant text-center py-10 text-xs">No tower units synchronized currently.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                  <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-xs font-bold text-on-surface-variant tracking-widest uppercase mb-4">SELECT RESIDENCE TOWER</h3>
                    {towers.map((tower) => (
                      <div
                        key={tower.id}
                        onClick={() => {
                          setActiveTowerId(tower.id);
                          const firstFlat = tower.floors?.[0]?.flats?.[0];
                          if (firstFlat) setFlatSelection(firstFlat);
                        }}
                        className={`p-6 border rounded cursor-pointer transition-colors duration-300 ${
                          activeTowerId === tower.id
                            ? 'bg-surface-container border-[var(--primary-color)]'
                            : 'bg-surface-container/40 border-outline-variant/70 hover:border-warm-taupe/60'
                        }`}
                      >
                        <h4 className={`text-lg font-medium ${activeTowerId === tower.id ? 'text-[var(--primary-color)]' : 'text-on-surface'}`} style={{ fontFamily: 'var(--font-header), serif' }}>
                          {tower.name}
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{tower.description || 'Luxury residence unit.'}</p>
                      </div>
                    ))}

                    {flatSelection && (
                      <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl mt-6">
                        <h4 className="text-xs font-bold text-[var(--primary-color)] mb-4 tracking-widest uppercase">UNIT #{flatSelection.flatNumber} SPECIFICATIONS</h4>
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between border-b border-outline-variant/70 pb-2">
                            <span className="text-on-surface-variant">Configuration</span>
                            <span className="text-on-surface font-semibold">{flatSelection.type}</span>
                          </div>
                          <div className="flex justify-between border-b border-outline-variant/70 pb-2">
                            <span className="text-on-surface-variant">SBA Size</span>
                            <span className="text-on-surface font-semibold">{flatSelection.sizeSqFt} sqft</span>
                          </div>
                          <div className="flex justify-between border-b border-outline-variant/70 pb-2">
                            <span className="text-on-surface-variant">Value Model</span>
                            <span className="text-[var(--primary-color)] font-bold">₹{(flatSelection.price / 10000000).toFixed(2)} Cr</span>
                          </div>
                          {flatSelection.orientation && (
                            <div className="flex justify-between border-b border-outline-variant/70 pb-2">
                              <span className="text-on-surface-variant">Orientation</span>
                              <span className="text-on-surface font-semibold">{flatSelection.orientation}</span>
                            </div>
                          )}
                          <div className="flex justify-between pb-2">
                            <span className="text-on-surface-variant">Unit Status</span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[9px] uppercase ${
                              flatSelection.status === 'AVAILABLE' ? 'bg-green-500/15 text-emerald-800' : flatSelection.status === 'HOLD' ? 'bg-amber-500/15 text-amber-800' : 'bg-red-500/15 text-red-800'
                            }`}>{flatSelection.status}</span>
                          </div>
                        </div>

                        {flatSelection.status === 'AVAILABLE' && (
                          <button
                            onClick={() => {
                              const el = document.getElementById('inquiry');
                              if (el) el.scrollIntoView({ block: 'start' });
                            }}
                            className={btnStyleClass('primary') + ' w-full mt-6'}
                          >
                            Request Private Tour
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-8 bg-surface-container/30 border border-outline-variant/70 p-8 rounded-2xl">
                    <h3 className="text-xs font-bold text-on-surface-variant tracking-widest uppercase mb-6">INVENTORY GRID</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {activeTowerFlats.map((unit) => (
                        <div
                          key={unit.id}
                          onClick={() => setFlatSelection(unit)}
                          className={`p-6 rounded-2xl border bg-surface-container/20 hover:bg-surface-container/50 transition-colors duration-300 cursor-pointer ${
                            flatSelection?.id === unit.id ? 'border-[var(--primary-color)]' : 'border-outline-variant/70'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-lg text-on-surface font-medium" style={{ fontFamily: 'var(--font-header), serif' }}>Suite {unit.flatNumber}</h4>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-wider ${
                              unit.status === 'AVAILABLE' ? 'bg-green-500/10 text-emerald-800' : unit.status === 'HOLD' ? 'bg-amber-500/10 text-amber-800' : 'bg-red-500/10 text-red-800'
                            }`}>{unit.status}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-4 text-xs text-on-surface-variant">
                            <span>{unit.type}</span>
                            <span>•</span>
                            <span>{unit.sizeSqFt} sqft</span>
                          </div>
                          <div className="flex justify-between items-end mt-6">
                            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Invest Model</span>
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
    <div style={themeStyles} className="min-h-screen bg-background text-on-surface font-body antialiased">
      <div>{submitError && <p role="alert" className="p-4 text-center text-red-800">{submitError}</p>}</div>
      <div ref={containerRef} className="flex flex-col w-full overflow-x-clip">
        {sections.map((sec, index) => renderSection(sec, index))}
      </div>
    </div>
  );
}
