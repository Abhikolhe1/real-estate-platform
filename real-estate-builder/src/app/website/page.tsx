'use client';

import React, { useState, useEffect } from 'react';
import PremiumButton from '@/components/premium-button';

interface Section {
  id: string;
  name: string;
  isActive: boolean;
  content?: { title?: string; subtitle?: string };
}

export default function WebsiteArchitectPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [logo, setLogo] = useState('AETHELGARD');
  const [primaryColor, setPrimaryColor] = useState('#d4af37');
  const [secondaryColor, setSecondaryColor] = useState('#131313');
  const [fontHeader, setFontHeader] = useState('Bodoni Moda');
  const [fontBody, setFontBody] = useState('Hanken Grotesk');
  const [loading, setLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const tenantId = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2'; // Seeded Aethelgard builder id

  useEffect(() => {
    // 1. Fetch layout sections
    fetch('http://localhost:3001/pages/by-slug/home', {
      headers: { 'x-tenant-id': tenantId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.sections) {
          setSections(data.sections);
        }
      })
      .catch(() => {});

    // 2. Fetch theme settings
    fetch('http://localhost:3001/builders/theme', {
      headers: { 'x-tenant-id': tenantId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.logo) setLogo(data.logo);
          if (data.primaryColor) setPrimaryColor(data.primaryColor);
          if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
          if (data.fontHeader) setFontHeader(data.fontHeader);
          if (data.fontBody) setFontBody(data.fontBody);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggleSection = (index: number) => {
    const updated = [...sections];
    updated[index].isActive = !updated[index].isActive;
    setSections(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSections(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSections(updated);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setSuccessMsg('');
    try {
      // 1. Publish visual page sections
      await fetch('http://localhost:3001/pages/by-slug/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ sections }),
      });

      // 2. Publish branding theme settings
      await fetch('http://localhost:3001/builders/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          logo,
          primaryColor,
          secondaryColor,
          fontHeader,
          fontBody,
        }),
      });

      setIsPublishing(false);
      setSuccessMsg('Branding and website layout successfully published live!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to publish settings:', err);
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-gray-900 border-t-transparent animate-spin"></div>
          <p className="text-sm font-bold text-gray-500 font-sans">Loading Visual Architect...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Website Visual Architect</h1>
          <p className="text-gray-500 text-sm mt-1">Design your branded homepage, customize typography styles, color palettes, and publish live.</p>
        </div>
        <div className="flex items-center gap-4">
          {successMsg && <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">{successMsg}</span>}
          <PremiumButton variant="primary" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : 'Publish Live'}
          </PremiumButton>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-8">
        {/* Left Side: Drag and drop layout items */}
        <section className="col-span-3 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-6">Homepage Section Layout</h3>
          <div className="flex flex-col gap-3">
            {sections.map((section, index) => (
              <div 
                key={section.id} 
                className={`flex justify-between items-center p-4 border rounded-2xl transition-all duration-300 ${
                  section.isActive ? 'border-gray-200 bg-white hover:bg-gray-50/50' : 'border-gray-100 bg-gray-50/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base text-gray-400">☰</span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-950">{section.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">ID: {section.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center font-bold text-xs"
                    >
                      ▲
                    </button>
                    <button 
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sections.length - 1}
                      className="w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center font-bold text-xs"
                    >
                      ▼
                    </button>
                  </div>

                  <button 
                    onClick={() => handleToggleSection(index)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      section.isActive ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {section.isActive ? 'Enabled' : 'Hidden'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Side: Colors, Logo, and Font selection */}
        <section className="col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-6">Branding & Theme Editor</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Company / Website Logo Text</label>
                <input
                  type="text"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Primary Color (HSL/Hex)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={primaryColor.startsWith('#') ? primaryColor : '#d4af37'}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Secondary Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={secondaryColor.startsWith('#') ? secondaryColor : '#131313'}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Heading Font Family</label>
                <select
                  value={fontHeader}
                  onChange={(e) => setFontHeader(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 bg-white"
                >
                  <option value="Bodoni Moda">Bodoni Moda (Serif Luxury)</option>
                  <option value="Outfit">Outfit (Geometric Modern)</option>
                  <option value="Cinzel">Cinzel (Classic Roman)</option>
                  <option value="Playfair Display">Playfair Display (Premium Elegant)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Body Font Family</label>
                <select
                  value={fontBody}
                  onChange={(e) => setFontBody(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 bg-white"
                >
                  <option value="Hanken Grotesk">Hanken Grotesk (Premium Geometric)</option>
                  <option value="Inter">Inter (Clean Minimal)</option>
                  <option value="Montserrat">Montserrat (Modern Sans)</option>
                  <option value="Lato">Lato (Warm Geometric)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gray-950 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Preview Indicator</h4>
              <p className="text-xs text-gray-300 mt-2">Branding styles are synchronized instantly to your client landing portal on publish.</p>
            </div>
            <div className="mt-6 border-t border-gray-800 pt-4 flex justify-between items-center">
              <span className="text-xs font-bold tracking-wider" style={{ color: primaryColor }}>{logo}</span>
              <span className="text-[10px] bg-gray-900 text-gray-400 font-bold px-2 py-1 rounded border border-gray-800 uppercase tracking-widest">Live Live</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
