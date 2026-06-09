'use client';

import React, { useState, useEffect } from 'react';
import PremiumButton from '@/components/premium-button';
import { gsap } from 'gsap';

export default function OverviewView() {
  const [builders] = useState([
    { id: '1', name: 'Elite Realty Group', slug: 'elite-realty', plan: 'Enterprise', users: 24, status: 'Active' },
    { id: '2', name: 'Apex Homes Corporation', slug: 'apex-homes', plan: 'Professional', users: 12, status: 'Active' },
    { id: '3', name: 'Vanguard Towers LLC', slug: 'vanguard-towers', plan: 'Starter', users: 4, status: 'Pending' },
  ]);

  useEffect(() => {
    // Run performant GSAP dynamic entry load
    gsap.fromTo('.anim-fade-up', 
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
    );
  }, []);

  return (
    <div>
      {/* Top Header Row */}
      <header className="flex justify-between items-center mb-10 anim-fade-up">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Platform Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Super governance dashboard monitoring SaaS metrics, storage allocation, and client tenants.</p>
        </div>
        <PremiumButton variant="primary">+ Add Builder</PremiumButton>
      </header>

      {/* Stats Cards Grid */}
      <section className="grid grid-cols-4 gap-6 mb-10 anim-fade-up">
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">💼</span>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-4">Active Builders</p>
          <h2 className="text-3xl font-black text-gray-900 mt-2">42</h2>
          <span className="text-[11px] text-green-600 font-bold block mt-2">↑ 12% Month-over-Month</span>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">💰</span>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-4">MRR Income</p>
          <h2 className="text-3xl font-black text-gray-900 mt-2">$84,250</h2>
          <span className="text-[11px] text-green-600 font-bold block mt-2">↑ 8.4% Month-over-Month</span>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">💿</span>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-4">System Storage</p>
          <h2 className="text-3xl font-black text-gray-900 mt-2">4.2 / 10 TB</h2>
          <div className="w-100 bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-violet-600 h-full w-[42%] rounded-full"></div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">🌐</span>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-4">API Request Volume</p>
          <h2 className="text-3xl font-black text-gray-900 mt-2">99.98%</h2>
          <span className="text-[11px] text-gray-400 font-bold block mt-2">Avg Latency: 42ms</span>
        </div>
      </section>

      {/* Builders Grid Table */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm anim-fade-up">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Tenant Registries</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-4 px-4">Builder Name</th>
                <th className="pb-4 px-4">Slug URL</th>
                <th className="pb-4 px-4">Pricing plan</th>
                <th className="pb-4 px-4">Users</th>
                <th className="pb-4 px-4">Status</th>
                <th className="pb-4 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {builders.map((builder) => (
                <tr key={builder.id} className="border-b border-gray-50 text-sm hover:bg-gray-50/50 transition-all">
                  <td className="py-4 px-4 font-bold text-gray-900">{builder.name}</td>
                  <td className="py-4 px-4 text-blue-500 font-medium">{builder.slug}.aetherplatform.com</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      builder.plan === 'Enterprise' ? 'bg-violet-50 text-violet-700' : builder.plan === 'Professional' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>{builder.plan}</span>
                  </td>
                  <td className="py-4 px-4 text-gray-500">{builder.users} Members</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1.5 font-bold ${builder.status === 'Active' ? 'text-green-500' : 'text-amber-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${builder.status === 'Active' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                      {builder.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button className="mr-3 text-gray-400 hover:text-gray-900">✏️</button>
                    <button className="text-red-400 hover:text-red-600">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
