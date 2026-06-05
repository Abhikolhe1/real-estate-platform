'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { paths } from '@/routes/paths';
import { useAuthStore } from '@/store/authStore';
import { gsap } from 'gsap';

interface DashboardStats {
  totalFlats: number;
  availableFlats: number;
  bookedFlats: number;
  heldFlats: number;
  totalTowers: number;
  inventoryAllocationPct: number;
  totalLeads: number;
  hotLeads: number;
  estimatedRevenue: number;
  walkthroughVisits: number;
}

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
  slug: string;
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'NEW' | 'CONTACTED' | 'WARM' | 'HOT' | 'CLOSED';
  project?: { name: string };
  createdAt: string;
}

const LEAD_STATUS_COLORS: Record<string, string> = {
  HOT: 'bg-red-50 text-red-600 border-red-100',
  WARM: 'bg-amber-50 text-amber-600 border-amber-100',
  CONTACTED: 'bg-blue-50 text-blue-600 border-blue-100',
  CLOSED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  NEW: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-purple-50 text-purple-700',
  UNDER_CONSTRUCTION: 'bg-amber-50 text-amber-700',
  READY: 'bg-emerald-50 text-emerald-700',
  SOLD_OUT: 'bg-gray-100 text-gray-600',
};

// Tenant ID - from seeded data. In production this comes from auth token.
const TENANT_ID = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

export default function DashboardOverviewPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const tenantId = user?.tenantId || TENANT_ID;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const headers: Record<string, string> = { 'x-tenant-id': tenantId };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [statsRes, projRes, leadsRes] = await Promise.all([
          fetch('http://localhost:3001/inventory/stats', { headers }),
          fetch('http://localhost:3001/projects', { headers }),
          fetch('http://localhost:3001/leads', { headers }),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (projRes.ok) setProjects(await projRes.json());
        if (leadsRes.ok) setLeads(await leadsRes.json());

        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    fetchAll();
  }, [tenantId, token]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.anim-up'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: 'power2.out' }
      );
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-gray-900 border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  const inventoryPct = stats?.inventoryAllocationPct ?? 0;
  const revenueInCr = stats ? (stats.estimatedRevenue / 10000000).toFixed(2) : '0';

  const kpiCards = [
    {
      icon: '🏗️',
      label: 'Total Projects',
      value: projects.length,
      sub: `${projects.filter(p => p.status === 'UNDER_CONSTRUCTION').length} under construction`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      link: paths.dashboard.projects,
    },
    {
      icon: '🏢',
      label: 'Building Towers',
      value: stats?.totalTowers ?? 0,
      sub: `${stats?.totalFlats ?? 0} total units`,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: paths.dashboard.towers,
    },
    {
      icon: '🛏️',
      label: 'Available Units',
      value: stats?.availableFlats ?? 0,
      sub: `${stats?.bookedFlats ?? 0} booked • ${stats?.heldFlats ?? 0} held`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      link: paths.dashboard.flats,
    },
    {
      icon: '🤝',
      label: 'CRM Leads',
      value: stats?.totalLeads ?? leads.length,
      sub: `${stats?.hotLeads ?? 0} hot leads`,
      color: 'text-red-600',
      bg: 'bg-red-50',
      link: paths.dashboard.leads,
    },
  ];

  return (
    <div ref={containerRef} className="space-y-10">
      {/* Header */}
      <header className="flex justify-between items-start anim-up">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Builder Workspace</h1>
          <p className="text-gray-400 text-sm mt-1">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="font-semibold text-gray-600">{user?.firstName || 'Admin'}</span>. Here's your portfolio overview.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={paths.dashboard.leads}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
          >
            View Leads
          </Link>
          <Link
            href={paths.dashboard.projects}
            className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition shadow-sm"
          >
            + New Project
          </Link>
        </div>
      </header>

      {/* Revenue + Allocation Banner */}
      <div className="grid grid-cols-2 gap-5 anim-up">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estimated Revenue</p>
          <h2 className="text-4xl font-black mt-2 tracking-tight">₹{revenueInCr} Cr</h2>
          <p className="text-xs text-gray-400 mt-2">From {stats?.bookedFlats ?? 0} booked units</p>
          <div className="mt-5 flex items-center gap-2">
            <span className="text-emerald-400 text-xs font-bold">↑ Live portfolio value</span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Inventory Allocation</p>
              <h2 className="text-4xl font-black text-gray-950 mt-1">{inventoryPct}%</h2>
            </div>
            <span className="text-2xl">🏠</span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gray-800 to-gray-600 transition-all duration-1000"
              style={{ width: `${inventoryPct}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-gray-400 font-bold">
            <span>{stats?.availableFlats ?? 0} Available</span>
            <span>{stats?.bookedFlats ?? 0} Booked</span>
            <span>{stats?.heldFlats ?? 0} On Hold</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5 anim-up">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            href={card.link}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
          >
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center text-xl mb-4`}>
              {card.icon}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{card.label}</p>
            <h3 className={`text-3xl font-black mt-1 ${card.color}`}>{card.value}</h3>
            <p className="text-[10px] text-gray-400 mt-2">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Projects + Leads Grid */}
      <div className="grid grid-cols-5 gap-6 anim-up">
        {/* Projects Portfolio */}
        <div className="col-span-3 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900">Properties Portfolio</h3>
            <Link href={paths.dashboard.projects} className="text-[11px] font-bold text-gray-400 hover:text-gray-700 transition">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {projects.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-3xl">🏗️</span>
                <p className="text-xs text-gray-400 mt-3">No projects yet.</p>
                <Link href={paths.dashboard.projects} className="text-xs font-bold text-gray-700 hover:underline mt-2 block">
                  + Create your first project
                </Link>
              </div>
            ) : (
              projects.slice(0, 6).map((project) => (
                <div key={project.id} className="px-5 py-4 flex justify-between items-center hover:bg-gray-50/60 transition">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{project.name}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">📍 {project.location || 'Location TBD'}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${PROJECT_STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600'}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CRM Leads */}
        <div className="col-span-2 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900">Recent CRM Leads</h3>
            <Link href={paths.dashboard.leads} className="text-[11px] font-bold text-gray-400 hover:text-gray-700 transition">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {leads.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-3xl">🤝</span>
                <p className="text-xs text-gray-400 mt-3">No leads yet.</p>
              </div>
            ) : (
              leads.slice(0, 7).map((lead) => (
                <div key={lead.id} className="px-5 py-3.5 flex justify-between items-center hover:bg-gray-50/60 transition">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{lead.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{lead.phone}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${LEAD_STATUS_COLORS[lead.status]}`}>
                    {lead.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-3 gap-5 anim-up">
        {[
          { label: 'Add Tower', desc: 'Create new building tower with floors', icon: '🏢', link: paths.dashboard.towers, color: 'hover:border-blue-200 hover:bg-blue-50/30' },
          { label: 'Upload Media', desc: 'Add GLB models, renders, blueprints', icon: '📁', link: paths.dashboard.media, color: 'hover:border-amber-200 hover:bg-amber-50/30' },
          { label: 'View Analytics', desc: 'Leads pipeline & property insights', icon: '📈', link: paths.dashboard.analytics, color: 'hover:border-purple-200 hover:bg-purple-50/30' },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.link}
            className={`bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all duration-300 hover:shadow-md ${action.color}`}
          >
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
              {action.icon}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{action.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{action.desc}</p>
            </div>
            <span className="ml-auto text-gray-300 text-lg">→</span>
          </Link>
        ))}
      </div>

      {/* Walkthrough Visits Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between anim-up">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🕶️</span>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Virtual Walkthrough Visits</h3>
            <p className="text-xs text-gray-500 mt-0.5">Immersive 3D property experiences via your public website</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-indigo-600">{(stats?.walkthroughVisits ?? 1840).toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Total visits</p>
        </div>
      </div>
    </div>
  );
}
