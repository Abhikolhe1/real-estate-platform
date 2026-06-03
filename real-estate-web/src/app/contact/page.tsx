'use client';

import React, { useState, useEffect } from 'react';
import PremiumButton from '@/components/premium-button';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    suiteType: '3 BHK Premier Room',
    visitDate: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    gsap.fromTo('.anim-contact',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      // Connect to NestJS multi-tenant Leads capture API
      await fetch('http://localhost:3001/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          builderSlug: 'aethelgard', // Resolve dynamically based on subdomain slug
        }),
      });

      // Animate transition on success
      gsap.to('.anim-form', {
        opacity: 0,
        y: -20,
        duration: 0.4,
        onComplete: () => {
          setSubmitted(true);
          setTimeout(() => {
            gsap.fromTo('.anim-success',
              { opacity: 0, scale: 0.95 },
              { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }
            );
          }, 50);
        }
      });
    } catch (err) {
      console.error('Failed to submit viewing lead:', err);
      alert('Could not submit reservation. Please try again.');
    }
  };

  return (
    <div className="pt-24 px-6 md:px-margin-desktop max-w-container-max mx-auto py-20 min-h-screen">
      <header className="mb-16 text-center max-w-2xl mx-auto">
        <span className="font-label-caps text-primary tracking-[0.3em] uppercase text-[10px] block mb-3">EXPERIENCE CENTRE</span>
        <h1 className="font-display-xl text-4xl md:text-headline-lg font-light text-on-surface">Connect With Us</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-4 leading-relaxed">
          Whether you are looking for a new home or a strategic investment, our experts are here to guide you through the world of Aethelgard.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Contact Info Sidebar */}
        <div className="lg:col-span-4 space-y-8 anim-contact">
          <div className="glass-panel p-8 border border-white/5 rounded-2xl relative overflow-hidden">
             <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/5 blur-3xl rounded-full"></div>
            <h3 className="font-label-caps text-xs text-primary mb-8 tracking-widest uppercase font-bold">DIRECT CONTACT</h3>
            <div className="space-y-8">
              <div className="flex items-center gap-5 group">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                  <Icon icon="solar:phone-calling-bold-duotone" className="text-xl" />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-label-caps uppercase tracking-wider">Sales Enquiry</p>
                  <p className="text-sm text-on-surface font-semibold">+91 40 1234 5678</p>
                </div>
              </div>
              <div className="flex items-center gap-5 group">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                  <Icon icon="solar:letter-bold-duotone" className="text-xl" />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-label-caps uppercase tracking-wider">Email Address</p>
                  <p className="text-sm text-on-surface font-semibold">sales@aethelgard.com</p>
                </div>
              </div>
              <div className="flex items-center gap-5 group">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                  <Icon icon="solar:map-point-bold-duotone" className="text-xl" />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-label-caps uppercase tracking-wider">Site Office</p>
                  <p className="text-sm text-on-surface font-semibold leading-relaxed">Khajaguda Hills Road, Manikonda, Hyderabad</p>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-white/5">
              <h4 className="font-label-caps text-[10px] text-on-surface-variant mb-6 tracking-widest uppercase text-center">WHATSAPP CONCIERGE</h4>
              <button className="w-full flex items-center justify-center gap-3 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] py-4 rounded-xl hover:bg-[#25D366]/20 transition-all duration-300 font-label-caps text-[10px] tracking-widest font-bold">
                <Icon icon="logos:whatsapp-icon" className="text-xl" />
                CHAT ON WHATSAPP
              </button>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-8 anim-contact">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="glass-panel p-8 md:p-12 rounded-2xl border border-white/5 space-y-6 anim-form shadow-2xl">
              <h3 className="font-headline-md text-2xl text-on-surface font-light mb-8 text-primary">Schedule Private Viewing</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold ml-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-surface-container border border-white/5 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary text-on-surface font-body-md transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold ml-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-surface-container border border-white/5 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary text-on-surface font-body-md transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold ml-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-surface-container border border-white/5 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary text-on-surface font-body-md transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold ml-1">Suite Category</label>
                  <div className="relative">
                    <select
                      value={formData.suiteType}
                      onChange={(e) => setFormData({ ...formData, suiteType: e.target.value })}
                      className="w-full bg-surface-container border border-white/5 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary text-on-surface font-body-md appearance-none transition-all"
                    >
                      <option>2 BHK Smart Living</option>
                      <option>3 BHK Premier Room</option>
                      <option>4 BHK Grand Penthouse</option>
                      <option>5 BHK Duplex Penthouse</option>
                    </select>
                    <Icon icon="solar:alt-arrow-down-bold-duotone" className="absolute right-5 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold ml-1">Preferred Visit Date</label>
                <input
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                  className="bg-surface-container border border-white/5 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary text-on-surface font-body-md transition-all" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold ml-1">Message or Special Instructions</label>
                <textarea
                  rows={4}
                  placeholder="Share any special instructions or design preferences..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="bg-surface-container border border-white/5 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary text-on-surface font-body-md resize-none transition-all"
                />
              </div>

              <PremiumButton type="submit" variant="primary" className="w-full py-5 tracking-[0.2em] text-[11px] mt-6 rounded-xl shadow-xl shadow-primary/20 uppercase font-bold">
                SUBMIT RESERVATION REQUEST
              </PremiumButton>
            </form>
          ) : (
            <div className="glass-panel p-16 rounded-2xl border border-white/5 text-center shadow-2xl anim-success relative overflow-hidden">
               <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full"></div>
              <Icon icon="solar:check-circle-bold-duotone" className="text-7xl text-primary mb-8 mx-auto animate-pulse" />
              <h3 className="font-display-xl text-4xl font-light text-white mb-6">Registration Completed</h3>
              <p className="text-on-surface-variant font-body-md text-base leading-relaxed max-w-md mx-auto mb-10">
                Thank you, <span className="text-primary font-bold">{formData.name}</span>. Your private viewing reservation for a <span className="text-on-surface font-semibold">{formData.suiteType}</span> has been processed. A relationship architect will contact you shortly.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ name: '', email: '', phone: '', suiteType: '3 BHK Premier Room', visitDate: '', message: '' });
                }}
                className="px-10 py-4 border border-white/10 hover:border-primary/50 text-on-surface font-label-caps text-[10px] tracking-widest hover:bg-white/5 transition-all duration-300 rounded-xl uppercase font-bold"
              >
                SCHEDULE ANOTHER VISIT
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
