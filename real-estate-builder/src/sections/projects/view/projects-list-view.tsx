'use client';

import React, { useState, useEffect } from 'react';
import PremiumButton from '@/components/premium-button';
import { gsap } from 'gsap';

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
  slug: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  project?: { name: string };
  createdAt: string;
}

export default function ProjectsListView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjLoc, setNewProjLoc] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  // Default Aethelgard builder tenant ID header mapping
  const tenantId = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

  const fetchData = async () => {
    try {
      // 1. Fetch projects
      const projRes = await fetch('http://localhost:3001/projects', {
        headers: { 'x-tenant-id': tenantId },
      });
      const projData = await projRes.json();
      setProjects(projData);

      // 2. Fetch CRM leads
      const leadsRes = await fetch('http://localhost:3001/leads', {
        headers: { 'x-tenant-id': tenantId },
      });
      const leadsData = await leadsRes.json();
      setLeads(leadsData);

      setLoading(false);

      // Trigger premium entry animations
      gsap.fromTo('.anim-fade-up', 
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
      );
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjLoc) return;

    try {
      const res = await fetch('http://localhost:3001/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          name: newProjName,
          location: newProjLoc,
          description: newProjDesc,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewProjName('');
        setNewProjLoc('');
        setNewProjDesc('');
        fetchData(); // Reload projects portfolio list!
      }
    } catch (err) {
      console.error('Error adding project:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-gray-900 border-t-transparent animate-spin"></div>
          <p className="text-sm font-bold text-gray-500">Loading Portfolio Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Header */}
      <header className="flex justify-between items-center mb-10 anim-fade-up">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Builder Workspace</h1>
          <p className="text-gray-500 text-sm mt-1">Manage project portfolios, track towers, floors, and close client leads.</p>
        </div>
        <PremiumButton variant="primary" onClick={() => setShowAddModal(true)}>
          + Add Project
        </PremiumButton>
      </header>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-4 gap-6 mb-10 anim-fade-up">
        <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">🏗️</span>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-4">Total Projects</p>
          <h2 className="text-3xl font-black text-gray-950 mt-1">{projects.length}</h2>
          <span className="text-[10px] text-gray-400 font-bold block mt-2">Active Portfolios</span>
        </div>

        <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">🏡</span>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-4">Inventory Allocation</p>
          <h2 className="text-3xl font-black text-gray-950 mt-1">62.4%</h2>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-gray-900 h-full w-[62.4%] rounded-full"></div>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">🤝</span>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-4">Sales CRM Leads</p>
          <h2 className="text-3xl font-black text-gray-950 mt-1">{leads.length}</h2>
          <span className="text-[10px] text-emerald-600 font-bold block mt-2">Active Followups</span>
        </div>

        <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-2xl">🕶️</span>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-4">Walkthrough visits</p>
          <h2 className="text-3xl font-black text-gray-950 mt-1">1,840</h2>
          <span className="text-[10px] text-gray-400 font-bold block mt-2">Avg Time: 4.8 mins</span>
        </div>
      </section>

      {/* Grid: Projects list & CRM leads */}
      <section className="grid grid-cols-5 gap-8 anim-fade-up">
        {/* Left Side: Current Properties Portfolio */}
        <div className="col-span-3 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-950 mb-6">Current Properties Portfolio</h3>
          <div className="flex flex-col gap-4">
            {projects.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No projects created yet. Click "+ Add Project" to get started.</p>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50/50 transition-all duration-300">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{project.name}</h4>
                    <p className="text-[11px] text-gray-500 mt-1">📍 {project.location} • Status: {project.status}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                      {project.status === 'UNDER_CONSTRUCTION' ? 'Under Construction' : project.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Quick Lead tracking */}
        <div className="col-span-2 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-950 mb-6">Recent CRM Sales Leads</h3>
          <div className="flex flex-col gap-4">
            {leads.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No client leads received yet.</p>
            ) : (
              leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex justify-between items-center pb-4 border-b border-gray-50">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{lead.name}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{lead.phone} • {lead.project?.name || 'Sky Penthouses'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    lead.status === 'HOT' ? 'bg-red-50 text-red-600' : lead.status === 'WARM' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'
                  }`}>{lead.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white border border-gray-150 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in mx-4">
            <h3 className="text-lg font-bold text-gray-950 mb-4">Add New Property Project</h3>
            <form onSubmit={handleAddProject} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Central Residence"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Worli, Mumbai"
                  value={newProjLoc}
                  onChange={(e) => setNewProjLoc(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Cinematic luxury skyscraper..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <PremiumButton type="submit" variant="primary">
                  Create Project
                </PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
