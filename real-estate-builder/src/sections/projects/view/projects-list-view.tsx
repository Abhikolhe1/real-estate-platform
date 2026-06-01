'use client';

import React, { useState, useEffect } from 'react';
import PremiumButton from '@/components/premium-button';
import { gsap } from 'gsap';

export default function ProjectsListView() {
  const [projects] = useState([
    { id: '1', name: 'Grand Horizon Heights', location: 'Downtown', towers: 3, flats: 180, sold: 124, status: 'Active' },
    { id: '2', name: 'Marina Luxury Villas', location: 'Seafront Drive', towers: 1, flats: 24, sold: 18, status: 'Active' },
    { id: '3', name: 'Royal Oak Residences', location: 'Greenwood Valley', towers: 2, flats: 60, sold: 0, status: 'Pre-launch' },
  ]);

  const [leads] = useState([
    { id: '1', name: 'Abhishek Kumar', phone: '+91 9876543210', email: 'abhishek@gmail.com', project: 'Grand Horizon Heights', status: 'Warm' },
    { id: '2', name: 'Sarah Connor', phone: '+1 555-0199', email: 'sarah@skynet.com', project: 'Marina Luxury Villas', status: 'Hot' },
    { id: '3', name: 'Rohan Sharma', phone: '+91 9123456789', email: 'rohan@sharma.in', project: 'Grand Horizon Heights', status: 'Cold' },
  ]);

  useEffect(() => {
    gsap.fromTo('.anim-fade-up', 
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
    );
  }, []);

  return (
    <div>
      {/* Top Header */}
      <header className="flex justify-between items-center mb-10 anim-fade-up">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Builder Workspace</h1>
          <p className="text-gray-500 text-sm mt-1">Manage project portfolios, track towers, floors, and close client leads.</p>
        </div>
        <PremiumButton variant="primary">+ Add Project</PremiumButton>
      </header>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-4 gap-6 mb-10 anim-fade-up">
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">🏗️</span>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-4">Total Projects</p>
          <h2 className="text-3xl font-black text-gray-900 mt-2">3</h2>
          <span className="text-[11px] text-blue-500 font-bold block mt-2">6 Towers Total</span>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">🏡</span>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-4">Inventory Allocation</p>
          <h2 className="text-3xl font-black text-gray-900 mt-2">53.7%</h2>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-blue-600 h-full w-[53.7%] rounded-full"></div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">🤝</span>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-4">Sales CRM Leads</p>
          <h2 className="text-3xl font-black text-gray-900 mt-2">342</h2>
          <span className="text-[11px] text-green-600 font-bold block mt-2">↑ 22 New Leads Today</span>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">🕶️</span>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-4">Walkthrough visits</p>
          <h2 className="text-3xl font-black text-gray-900 mt-2">1,840</h2>
          <span className="text-[11px] text-gray-400 font-bold block mt-2">Avg Time: 4.8 mins</span>
        </div>
      </section>

      {/* Grid: Projects list & CRM leads */}
      <section className="grid grid-cols-5 gap-8 anim-fade-up">
        {/* Left Side: Current Properties Portfolio */}
        <div className="col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Current Properties Portfolio</h3>
          <div className="flex flex-col gap-4">
            {projects.map((project) => (
              <div key={project.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-all">
                <div>
                  <h4 className="font-bold text-gray-900">{project.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">📍 {project.location} • {project.towers} Towers • {project.flats} Units</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    project.status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>{project.status}</span>
                  <p className="text-xs text-gray-400 mt-2">Allocated: {project.sold} / {project.flats}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Quick Lead tracking */}
        <div className="col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Sales Leads</h3>
          <div className="flex flex-col gap-4">
            {leads.map((lead) => (
              <div key={lead.id} className="flex justify-between items-center pb-4 border-b border-gray-50">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{lead.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{lead.phone} • {lead.project}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  lead.status === 'Hot' ? 'bg-red-50 text-red-600' : lead.status === 'Warm' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'
                }`}>{lead.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
