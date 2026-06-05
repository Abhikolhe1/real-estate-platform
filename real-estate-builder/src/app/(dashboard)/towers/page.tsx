'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { gsap } from 'gsap';

interface Tower {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  project?: { name: string; location?: string };
  floors?: { id: string; floorNumber: number; flats?: any[] }[];
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  location?: string;
}

const TENANT_ID = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

export default function TowersPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || TENANT_ID;
  const headers = () => ({
    'x-tenant-id': tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const [towers, setTowers] = useState<Tower[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTower, setEditTower] = useState<Tower | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    floorsCount: 5,
  });

  const fetchData = async () => {
    try {
      const [towersRes, projRes] = await Promise.all([
        fetch('http://localhost:3001/inventory/towers', { headers: headers() }),
        fetch('http://localhost:3001/projects', { headers: headers() }),
      ]);
      if (towersRes.ok) setTowers(await towersRes.json());
      if (projRes.ok) {
        const proj = await projRes.json();
        setProjects(proj);
        if (proj.length > 0) setFormData(f => ({ ...f, projectId: proj[0].id }));
      }
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.tower-card', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out' });
    }
  }, [loading]);

  const openAdd = () => {
    setEditTower(null);
    setFormData({ name: '', description: '', projectId: projects[0]?.id || '', floorsCount: 5 });
    setShowModal(true);
  };

  const openEdit = (t: Tower) => {
    setEditTower(t);
    setFormData({ name: t.name, description: t.description || '', projectId: t.projectId, floorsCount: 5 });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTower) {
        await fetch(`http://localhost:3001/inventory/towers/${editTower.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...headers() },
          body: JSON.stringify({ name: formData.name, description: formData.description }),
        });
      } else {
        await fetch('http://localhost:3001/inventory/towers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers() },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            projectId: formData.projectId,
            floorsCount: formData.floorsCount,
          }),
        });
      }
      setShowModal(false);
      fetchData();
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tower? All floors and flats under it will also be removed.')) return;
    try {
      await fetch(`http://localhost:3001/inventory/towers/${id}`, { method: 'DELETE', headers: headers() });
      fetchData();
    } catch { }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Towers...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Building Towers</h1>
          <p className="text-gray-400 text-sm mt-1">Manage tower blocks, auto-generate floors and flat units.</p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition shadow-sm"
        >
          + Add Tower
        </button>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Towers', value: towers.length, icon: '🏢' },
          { label: 'Total Floors', value: towers.reduce((s, t) => s + (t.floors?.length ?? 0), 0), icon: '🏠' },
          { label: 'Total Units', value: towers.reduce((s, t) => s + (t.floors?.reduce((fs, f) => fs + (f.flats?.length ?? 0), 0) ?? 0), 0), icon: '🛏️' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <span className="text-3xl">{stat.icon}</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Towers Grid */}
      {towers.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 flex flex-col items-center gap-3 shadow-sm">
          <span className="text-5xl">🏢</span>
          <p className="font-bold text-gray-700">No towers yet</p>
          <p className="text-sm text-gray-400">Add a tower and specify floors to auto-generate flat units.</p>
          <button onClick={openAdd} className="mt-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition">
            + Add First Tower
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {towers.map(tower => {
            const totalFlats = tower.floors?.reduce((s, f) => s + (f.flats?.length ?? 0), 0) ?? 0;
            const projectName = tower.project?.name || projects.find(p => p.id === tower.projectId)?.name || 'Unknown Project';
            return (
              <div key={tower.id} className="tower-card bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                {/* Tower Visual Header */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-5 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="border-b border-white/20 h-[12.5%]" />
                    ))}
                  </div>
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{projectName}</p>
                      <h3 className="text-lg font-black text-white mt-1">{tower.name}</h3>
                    </div>
                    <span className="text-3xl">🏢</span>
                  </div>
                  <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-xl p-2.5">
                      <p className="text-[9px] text-gray-400 font-bold uppercase">Floors</p>
                      <p className="text-lg font-black text-white mt-0.5">{tower.floors?.length ?? 0}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2.5">
                      <p className="text-[9px] text-gray-400 font-bold uppercase">Units</p>
                      <p className="text-lg font-black text-white mt-0.5">{totalFlats}</p>
                    </div>
                  </div>
                </div>

                {/* Tower Card Body */}
                <div className="p-5">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {tower.description || 'Premium residential tower with modern amenities.'}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openEdit(tower)}
                      className="flex-1 py-2 rounded-xl bg-gray-50 text-gray-700 text-xs font-bold hover:bg-gray-100 transition text-center"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tower.id)}
                      className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition text-center"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{editTower ? 'Edit Tower' : 'Add New Tower'}</h3>
            <p className="text-xs text-gray-400 mb-6">
              {editTower ? `Modifying: ${editTower.name}` : 'Creates a tower and auto-generates floors with flat units.'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editTower && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Link to Project *</label>
                  <select
                    value={formData.projectId}
                    onChange={e => setFormData(f => ({ ...f, projectId: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-900 transition"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.location ? ` — ${p.location}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tower Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tower A – Sky Residence"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Luxury high-rise tower with panoramic city views..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition resize-none"
                />
              </div>
              {!editTower && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Number of Floors (auto-seeds 2 flats each)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.floorsCount}
                    onChange={e => setFormData(f => ({ ...f, floorsCount: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Will auto-generate {formData.floorsCount} floors × 2 flat units = {formData.floorsCount * 2} units total</p>
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:bg-gray-50 rounded-xl transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition disabled:opacity-50">
                  {saving ? 'Saving...' : editTower ? 'Save Changes' : 'Create Tower'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
