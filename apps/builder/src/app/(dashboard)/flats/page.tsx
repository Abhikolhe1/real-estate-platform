'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { gsap } from 'gsap';

interface Flat {
  id: string;
  flatNumber: string;
  status: 'AVAILABLE' | 'BOOKED' | 'HOLD';
  sizeSqFt: number;
  price: number;
  type: '1BHK' | '2BHK' | '3BHK' | 'PENTHOUSE';
  orientation?: string;
  description?: string;
  floor?: { floorNumber: number; tower?: { name: string; project?: { name: string } } };
}

interface Tower {
  id: string;
  name: string;
  description?: string;
  project?: { name: string };
}

const STATUS_STYLES: Record<string, { card: string; badge: string; dot: string }> = {
  AVAILABLE: { card: 'border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/60', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-400' },
  BOOKED: { card: 'border-blue-100 bg-blue-50/30 hover:bg-blue-50/60', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-400' },
  HOLD: { card: 'border-amber-100 bg-amber-50/30 hover:bg-amber-50/60', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' },
};

const TYPE_ICONS: Record<string, string> = { '1BHK': '🛏️', '2BHK': '🛋️', '3BHK': '🏡', 'PENTHOUSE': '✨' };

const TENANT_ID = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

export default function FlatsInventoryPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || TENANT_ID;
  const getHeaders = () => ({
    'x-tenant-id': tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const [flats, setFlats] = useState<Flat[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);
  const [statusInput, setStatusInput] = useState<'AVAILABLE' | 'BOOKED' | 'HOLD'>('AVAILABLE');
  const [priceInput, setPriceInput] = useState(0);
  const [typeInput, setTypeInput] = useState<Flat['type']>('2BHK');
  const [orientInput, setOrientInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddTowerModal, setShowAddTowerModal] = useState(false);
  const [newTowerName, setNewTowerName] = useState('');
  const [newTowerFloors, setNewTowerFloors] = useState(5);
  const [selectedProjId, setSelectedProjId] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [towerFilter, setTowerFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchData = async () => {
    try {
      const [flatsRes, towersRes, projRes] = await Promise.all([
        fetch('http://localhost:3001/inventory/flats', { headers: getHeaders() }),
        fetch('http://localhost:3001/inventory/towers', { headers: getHeaders() }),
        fetch('http://localhost:3001/projects', { headers: getHeaders() }),
      ]);
      if (flatsRes.ok) setFlats(await flatsRes.json());
      if (towersRes.ok) setTowers(await towersRes.json());
      if (projRes.ok) {
        const proj = await projRes.json();
        setProjects(proj);
        if (proj.length > 0) setSelectedProjId(proj[0].id);
      }
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.flat-unit', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out' });
    }
  }, [loading, statusFilter, typeFilter, towerFilter]);

  const filteredFlats = useMemo(() => {
    return flats.filter(f => {
      const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;
      const matchType = typeFilter === 'ALL' || f.type === typeFilter;
      const matchTower = towerFilter === 'ALL' || f.floor?.tower?.name === towerFilter;
      return matchStatus && matchType && matchTower;
    });
  }, [flats, statusFilter, typeFilter, towerFilter]);

  const stats = useMemo(() => ({
    total: flats.length,
    available: flats.filter(f => f.status === 'AVAILABLE').length,
    booked: flats.filter(f => f.status === 'BOOKED').length,
    held: flats.filter(f => f.status === 'HOLD').length,
    totalValue: flats.reduce((s, f) => s + Number(f.price), 0),
    bookedValue: flats.filter(f => f.status === 'BOOKED').reduce((s, f) => s + Number(f.price), 0),
  }), [flats]);

  const handleOpenEdit = (flat: Flat) => {
    setSelectedFlat(flat);
    setStatusInput(flat.status);
    setPriceInput(Number(flat.price));
    setTypeInput(flat.type);
    setOrientInput(flat.orientation || '');
  };

  const handleSaveFlatStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlat) return;
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:3001/inventory/flats/${selectedFlat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ status: statusInput, price: priceInput, orientation: orientInput }),
      });
      if (res.ok) { setSelectedFlat(null); fetchData(); }
    } catch { } finally { setIsSaving(false); }
  };

  const handleDeleteFlat = async (id: string) => {
    if (!confirm('Remove this flat unit?')) return;
    try {
      await fetch(`http://localhost:3001/inventory/flats/${id}`, { method: 'DELETE', headers: getHeaders() });
      fetchData();
    } catch { }
  };

  const handleCreateTower = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTowerName || !selectedProjId) return;
    try {
      const res = await fetch('http://localhost:3001/inventory/towers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ name: newTowerName, projectId: selectedProjId, floorsCount: newTowerFloors }),
      });
      if (res.ok) { setShowAddTowerModal(false); setNewTowerName(''); setNewTowerFloors(5); fetchData(); }
    } catch { }
  };

  const uniqueTowerNames = Array.from(new Set(flats.map(f => f.floor?.tower?.name).filter((n): n is string => Boolean(n))));

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Inventory...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Flats & Inventory</h1>
          <p className="text-gray-400 text-sm mt-1">Manage apartment units, pricing, availability and floor allocations.</p>
        </div>
        <button onClick={() => setShowAddTowerModal(true)} className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition shadow-sm">
          + Add Tower
        </button>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Units', value: stats.total, color: 'text-gray-900' },
          { label: 'Available', value: stats.available, color: 'text-emerald-600' },
          { label: 'Booked', value: stats.booked, color: 'text-blue-600' },
          { label: 'On Hold', value: stats.held, color: 'text-amber-600' },
          { label: 'Revenue', value: `₹${(stats.bookedValue / 10000000).toFixed(1)}Cr`, color: 'text-gray-900' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex gap-1.5">
          {['ALL', 'AVAILABLE', 'BOOKED', 'HOLD'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${statusFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['ALL', '1BHK', '2BHK', '3BHK', 'PENTHOUSE'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${typeFilter === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
            >
              {t}
            </button>
          ))}
        </div>
        {uniqueTowerNames.length > 0 && (
          <select
            value={towerFilter}
            onChange={e => setTowerFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 focus:outline-none focus:border-gray-400"
          >
            <option value="ALL">All Towers</option>
            {uniqueTowerNames.map(n => <option key={n} value={n!}>{n}</option>)}
          </select>
        )}
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${viewMode === 'grid' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>
            Grid
          </button>
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${viewMode === 'list' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>
            List
          </button>
        </div>
        <span className="text-xs font-bold text-gray-400">{filteredFlats.length} units</span>
      </div>

      {/* Flats Display */}
      {filteredFlats.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-14 flex flex-col items-center gap-3 shadow-sm">
          <span className="text-4xl">🛏️</span>
          <p className="font-bold text-gray-700">No units found</p>
          <p className="text-sm text-gray-400">Add a tower to auto-generate floor and flat units.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-4 gap-4">
          {filteredFlats.map(flat => {
            const styles = STATUS_STYLES[flat.status];
            return (
              <div
                key={flat.id}
                onClick={() => handleOpenEdit(flat)}
                className={`flat-unit border rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden ${styles.card}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xl">{TYPE_ICONS[flat.type]}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>{flat.status}</span>
                </div>
                <h4 className="text-base font-black text-gray-950">Unit {flat.flatNumber}</h4>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 tracking-wider">{flat.type} • {flat.sizeSqFt} sqft</p>
                {flat.floor?.tower?.name && (
                  <p className="text-[10px] text-gray-400 mt-1">🏢 {flat.floor.tower.name} · Floor {flat.floor.floorNumber}</p>
                )}
                <div className="border-t border-current/10 mt-3 pt-3 flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 font-bold">
                    {flat.orientation || 'N/A'}
                  </span>
                  <span className="text-xs font-black text-gray-900">₹{(Number(flat.price) / 10000000).toFixed(2)} Cr</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="py-3 px-5 text-left">Unit</th>
                <th className="py-3 px-5 text-left">Type</th>
                <th className="py-3 px-5 text-left">Tower / Floor</th>
                <th className="py-3 px-5 text-left">Status</th>
                <th className="py-3 px-5 text-left">Price</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredFlats.map(flat => (
                <tr key={flat.id} className="hover:bg-gray-50/40 transition text-sm">
                  <td className="py-3.5 px-5 font-bold text-gray-900">Unit {flat.flatNumber}</td>
                  <td className="py-3.5 px-5 text-gray-600">{TYPE_ICONS[flat.type]} {flat.type} · {flat.sizeSqFt} sqft</td>
                  <td className="py-3.5 px-5 text-gray-500 text-xs">
                    {flat.floor?.tower?.name || '—'} · Floor {flat.floor?.floorNumber || '—'}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[flat.status].badge}`}>
                      {flat.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-bold text-gray-800">₹{(Number(flat.price) / 10000000).toFixed(2)} Cr</td>
                  <td className="py-3.5 px-5 text-right">
                    <button onClick={() => handleOpenEdit(flat)} className="px-3 py-1 text-[11px] font-bold bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition mr-2">Edit</button>
                    <button onClick={() => handleDeleteFlat(flat.id)} className="px-3 py-1 text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Flat Modal */}
      {selectedFlat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Update Unit {selectedFlat.flatNumber}</h3>
            <p className="text-xs text-gray-400 mb-6">
              {selectedFlat.type} · {selectedFlat.sizeSqFt} sqft
              {selectedFlat.floor?.tower?.name ? ` · ${selectedFlat.floor.tower.name} Floor ${selectedFlat.floor.floorNumber}` : ''}
            </p>
            <form onSubmit={handleSaveFlatStatus} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Availability Status</label>
                <select
                  value={statusInput}
                  onChange={e => setStatusInput(e.target.value as Flat['status'])}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-900 transition"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="BOOKED">Booked (Sold)</option>
                  <option value="HOLD">Hold (Reserved)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Listing Price (INR)</label>
                <input
                  type="number"
                  value={priceInput}
                  onChange={e => setPriceInput(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
                <p className="text-[10px] text-gray-400 mt-1">= ₹{(priceInput / 10000000).toFixed(2)} Crore</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Orientation</label>
                <input
                  type="text"
                  value={orientInput}
                  onChange={e => setOrientInput(e.target.value)}
                  placeholder="e.g. East-facing, Sea View, Garden Facing"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setSelectedFlat(null)} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:bg-gray-50 rounded-xl transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition disabled:opacity-50">
                  {isSaving ? 'Updating...' : 'Update Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tower Modal */}
      {showAddTowerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add Building Tower</h3>
            <p className="text-xs text-gray-400 mb-6">Auto-seeds floors and flat units under this tower.</p>
            <form onSubmit={handleCreateTower} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Project *</label>
                <select
                  value={selectedProjId}
                  onChange={e => setSelectedProjId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-900 transition"
                >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tower Name *</label>
                <input
                  required type="text" value={newTowerName}
                  onChange={e => setNewTowerName(e.target.value)}
                  placeholder="e.g. Tower B – Pearl Heights"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Number of Floors</label>
                <input
                  type="number" min={1} max={50} value={newTowerFloors}
                  onChange={e => setNewTowerFloors(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
                <p className="text-[10px] text-gray-400 mt-1">Auto-generates {newTowerFloors} floors × 2 units = {newTowerFloors * 2} total units</p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAddTowerModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:bg-gray-50 rounded-xl transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition">Seed Tower</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
