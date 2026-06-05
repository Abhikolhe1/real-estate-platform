'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { gsap } from 'gsap';

interface Floor {
  id: string;
  towerId: string;
  floorNumber: number;
  description?: string;
  flats?: { id: string; flatNumber: string; status: string; price: number; sizeSqFt: number; type: string }[];
  createdAt: string;
}

interface Tower {
  id: string;
  name: string;
  project?: { name: string };
}

const FLAT_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  BOOKED: 'bg-blue-50 text-blue-700',
  HOLD: 'bg-amber-50 text-amber-700',
};

const TENANT_ID = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

export default function FloorsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || TENANT_ID;
  const getHeaders = () => ({
    'x-tenant-id': tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const [towers, setTowers] = useState<Tower[]>([]);
  const [selectedTowerId, setSelectedTowerId] = useState('');
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedFloor, setExpandedFloor] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ floorNumber: 1, description: '', flatsCount: 2 });

  const fetchTowers = async () => {
    try {
      const res = await fetch('http://localhost:3001/inventory/towers', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTowers(data);
        if (data.length > 0) setSelectedTowerId(data[0].id);
      }
      setLoading(false);
    } catch { setLoading(false); }
  };

  const fetchFloors = async (towerId: string) => {
    if (!towerId) return;
    try {
      const res = await fetch(`http://localhost:3001/inventory/floors?towerId=${towerId}`, { headers: getHeaders() });
      if (res.ok) setFloors(await res.json());
    } catch { }
  };

  useEffect(() => { fetchTowers(); }, []);

  useEffect(() => {
    if (selectedTowerId) fetchFloors(selectedTowerId);
  }, [selectedTowerId]);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.floor-row', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' });
    }
  }, [loading, floors]);

  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('http://localhost:3001/inventory/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({
          towerId: selectedTowerId,
          floorNumber: formData.floorNumber,
          description: formData.description,
          flatsCount: formData.flatsCount,
        }),
      });
      setShowAddModal(false);
      fetchFloors(selectedTowerId);
    } catch { } finally { setSaving(false); }
  };

  const handleDeleteFloor = async (id: string) => {
    if (!confirm('Delete this floor? All flat units on this floor will be removed.')) return;
    try {
      await fetch(`http://localhost:3001/inventory/floors/${id}`, { method: 'DELETE', headers: getHeaders() });
      fetchFloors(selectedTowerId);
    } catch { }
  };

  const selectedTower = towers.find(t => t.id === selectedTowerId);
  const totalUnits = floors.reduce((s, f) => s + (f.flats?.length ?? 0), 0);
  const bookedUnits = floors.reduce((s, f) => s + (f.flats?.filter(fl => fl.status === 'BOOKED').length ?? 0), 0);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Floors...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Floor Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage floor levels within each tower block and their flat units.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!selectedTowerId}
          className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition shadow-sm disabled:opacity-40"
        >
          + Add Floor
        </button>
      </header>

      {/* Tower Selector */}
      {towers.length > 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Select Tower</p>
          <div className="flex flex-wrap gap-2">
            {towers.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTowerId(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  selectedTowerId === t.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                🏢 {t.name}
                {t.project?.name && <span className="text-[9px] opacity-60 ml-1">({t.project.name})</span>}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-sm text-amber-700">
          ⚠️ No towers found. Please <a href="/towers" className="font-bold underline">add a tower</a> first.
        </div>
      )}

      {selectedTowerId && (
        <>
          {/* Tower Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Tower', value: selectedTower?.name || '—', icon: '🏢' },
              { label: 'Total Floors', value: floors.length, icon: '🏠' },
              { label: 'Units Status', value: `${bookedUnits}/${totalUnits} Booked`, icon: '🛏️' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5 truncate">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Floors List */}
          <div className="space-y-3">
            {floors.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl py-14 flex flex-col items-center gap-3 shadow-sm">
                <span className="text-4xl">🏠</span>
                <p className="font-bold text-gray-700">No floors in this tower</p>
                <p className="text-sm text-gray-400">Click "+ Add Floor" to add a floor level.</p>
              </div>
            ) : (
              floors
                .sort((a, b) => a.floorNumber - b.floorNumber)
                .map(floor => {
                  const flats = floor.flats ?? [];
                  const isExpanded = expandedFloor === floor.id;
                  const avail = flats.filter(f => f.status === 'AVAILABLE').length;
                  const booked = flats.filter(f => f.status === 'BOOKED').length;
                  const held = flats.filter(f => f.status === 'HOLD').length;
                  return (
                    <div key={floor.id} className="floor-row bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                      {/* Floor Header */}
                      <div
                        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/60 transition"
                        onClick={() => setExpandedFloor(isExpanded ? null : floor.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-black text-sm">
                            {floor.floorNumber}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">Floor {floor.floorNumber}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{floor.description || `Level ${floor.floorNumber}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-3 text-[11px] font-bold">
                            <span className="text-emerald-600">{avail} Avail</span>
                            <span className="text-blue-600">{booked} Booked</span>
                            {held > 0 && <span className="text-amber-600">{held} Hold</span>}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFloor(floor.id); }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-[10px] font-bold hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
                          <span className="text-gray-300 text-sm">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Expanded Flats Grid */}
                      {isExpanded && (
                        <div className="border-t border-gray-50 px-5 py-4 bg-gray-50/30">
                          {flats.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">No flat units on this floor.</p>
                          ) : (
                            <div className="grid grid-cols-4 gap-3">
                              {flats.map(flat => (
                                <div
                                  key={flat.id}
                                  className={`p-3 rounded-xl border text-center ${
                                    flat.status === 'AVAILABLE' ? 'border-emerald-100 bg-emerald-50/40' :
                                    flat.status === 'BOOKED' ? 'border-blue-100 bg-blue-50/40' :
                                    'border-amber-100 bg-amber-50/40'
                                  }`}
                                >
                                  <p className="font-black text-gray-900 text-sm">Unit {flat.flatNumber}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{flat.type} · {flat.sizeSqFt} sqft</p>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 block ${FLAT_STATUS_COLORS[flat.status]}`}>
                                    {flat.status}
                                  </span>
                                  <p className="text-[10px] font-bold text-gray-700 mt-1.5">₹{(flat.price / 10000000).toFixed(2)} Cr</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </>
      )}

      {/* Add Floor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add New Floor</h3>
            <p className="text-xs text-gray-400 mb-6">to {selectedTower?.name}</p>
            <form onSubmit={handleAddFloor} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Floor Number *</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={formData.floorNumber}
                  onChange={e => setFormData(f => ({ ...f, floorNumber: Number(e.target.value) }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Penthouse Level"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Auto-seed Flat Units
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={formData.flatsCount}
                  onChange={e => setFormData(f => ({ ...f, flatsCount: Number(e.target.value) }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
                <p className="text-[10px] text-gray-400 mt-1">Will auto-create {formData.flatsCount} available flat units</p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:bg-gray-50 rounded-xl transition">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition disabled:opacity-50">
                  {saving ? 'Creating...' : 'Add Floor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
