'use client';

import React, { useState, useEffect } from 'react';
import PremiumButton from '@/components/premium-button';

interface Flat {
  id: string;
  flatNumber: string;
  status: 'AVAILABLE' | 'BOOKED' | 'HOLD';
  sizeSqFt: number;
  price: number;
  type: '1BHK' | '2BHK' | '3BHK' | 'PENTHOUSE';
  orientation?: string;
  description?: string;
  floor?: { floorNumber: number; tower?: { name: string } };
}

interface Tower {
  id: string;
  name: string;
  description?: string;
  project?: { name: string };
}

export default function FlatsInventoryPage() {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);
  const [statusInput, setStatusInput] = useState<'AVAILABLE' | 'BOOKED' | 'HOLD'>('AVAILABLE');
  const [priceInput, setPriceInput] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddTowerModal, setShowAddTowerModal] = useState(false);
  const [newTowerName, setNewTowerName] = useState('');
  const [newTowerFloors, setNewTowerFloors] = useState(3);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedProjId, setSelectedProjId] = useState('');

  const tenantId = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2'; // Seeded Aethelgard builder id

  const fetchData = async () => {
    try {
      // 1. Fetch flats
      const flatsRes = await fetch('http://localhost:3001/inventory/flats', {
        headers: { 'x-tenant-id': tenantId },
      });
      const flatsData = await flatsRes.json();
      setFlats(flatsData);

      // 2. Fetch towers
      const towersRes = await fetch('http://localhost:3001/inventory/towers', {
        headers: { 'x-tenant-id': tenantId },
      });
      const towersData = await towersRes.json();
      setTowers(towersData);

      // 3. Fetch projects list
      const projRes = await fetch('http://localhost:3001/projects', {
        headers: { 'x-tenant-id': tenantId },
      });
      const projData = await projRes.json();
      setProjectsList(projData);
      if (projData.length > 0) {
        setSelectedProjId(projData[0].id);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEdit = (flat: Flat) => {
    setSelectedFlat(flat);
    setStatusInput(flat.status);
    setPriceInput(Number(flat.price));
  };

  const handleSaveFlatStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlat) return;

    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:3001/inventory/flats/${selectedFlat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          status: statusInput,
          price: priceInput,
        }),
      });

      if (res.ok) {
        setSelectedFlat(null);
        fetchData(); // Reload inventory!
      }
      setIsSaving(false);
    } catch (err) {
      console.error('Error saving flat status:', err);
      setIsSaving(false);
    }
  };

  const handleCreateTower = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTowerName || !selectedProjId) return;

    try {
      const res = await fetch('http://localhost:3001/inventory/towers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          name: newTowerName,
          projectId: selectedProjId,
          floorsCount: newTowerFloors,
        }),
      });

      if (res.ok) {
        setShowAddTowerModal(false);
        setNewTowerName('');
        setNewTowerFloors(3);
        fetchData(); // Reload towers and flats!
      }
    } catch (err) {
      console.error('Error seeding tower:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-gray-900 border-t-transparent animate-spin"></div>
          <p className="text-sm font-bold text-gray-500 font-sans">Loading Flats Inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Apartments & Flats Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">Review active flat layout plans, allocate tower units, and change availability statuses.</p>
        </div>
        <div className="flex gap-4">
          <PremiumButton variant="primary" onClick={() => setShowAddTowerModal(true)}>
            + Add Tower
          </PremiumButton>
        </div>
      </header>

      {/* Grid: Towers and Flats */}
      <div className="grid grid-cols-5 gap-8">
        {/* Left Side: Towers List */}
        <section className="col-span-2 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm h-fit">
          <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider mb-6">Building Towers</h3>
          <div className="flex flex-col gap-4">
            {towers.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No towers configured. Click "+ Add Tower" to get started.</p>
            ) : (
              towers.map((tower) => (
                <div key={tower.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition duration-300">
                  <h4 className="font-bold text-gray-900 text-sm">{tower.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Project: {tower.project?.name || 'Aethelgard Sky'}</p>
                  <p className="text-xs text-gray-500 mt-2">{tower.description || 'Branded luxury residence tower.'}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Side: Flat Grid List */}
        <section className="col-span-3 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider mb-6">Units Allocation Grid</h3>

          <div className="grid grid-cols-3 gap-4">
            {flats.length === 0 ? (
              <p className="col-span-3 text-xs text-gray-400 py-12 text-center">No flats seeded. Add a tower and specify floor counts to auto-generate units.</p>
            ) : (
              flats.map((flat) => (
                <div 
                  key={flat.id} 
                  onClick={() => handleOpenEdit(flat)}
                  className={`p-4 border rounded-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden ${
                    flat.status === 'AVAILABLE' ? 'border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40' :
                    flat.status === 'BOOKED' ? 'border-blue-100 bg-blue-50/20 hover:bg-blue-50/40' :
                    'border-amber-100 bg-amber-50/20 hover:bg-amber-50/40'
                  }`}
                >
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full absolute top-3 right-3 ${
                    flat.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
                    flat.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {flat.status}
                  </span>

                  <h4 className="text-lg font-black text-gray-950">Unit {flat.flatNumber}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{flat.type} • {flat.sizeSqFt} SqFt</p>
                  
                  <div className="border-t border-gray-100/50 mt-4 pt-3 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-bold">Floor {flat.floor?.floorNumber || 1}</span>
                    <span className="text-xs font-bold text-gray-900">₹{(flat.price / 10000000).toFixed(2)} Cr</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Edit Flat Status Modal */}
      {selectedFlat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white border border-gray-150 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-gray-950 mb-2">Update Flat Unit {selectedFlat.flatNumber}</h3>
            <p className="text-xs text-gray-400 mb-6">Review pricing specifications and modify inventory status.</p>
            <form onSubmit={handleSaveFlatStatus} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Availability Status</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as any)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 bg-white"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="BOOKED">Booked (Sold)</option>
                  <option value="HOLD">Hold (Reserved)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Unit Pricing (INR)</label>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(Number(e.target.value))}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900"
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedFlat(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <PremiumButton type="submit" variant="primary" disabled={isSaving}>
                  {isSaving ? 'Updating...' : 'Update Unit'}
                </PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tower Modal */}
      {showAddTowerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white border border-gray-150 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-gray-950 mb-2">Seed New Building Tower</h3>
            <p className="text-xs text-gray-400 mb-6">Seeds floors and default flat units dynamically under this property.</p>
            <form onSubmit={handleCreateTower} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Project Portfolio Link</label>
                <select
                  value={selectedProjId}
                  onChange={(e) => setSelectedProjId(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 bg-white"
                >
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Tower Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tower C - Gold Pent"
                  value={newTowerName}
                  onChange={(e) => setNewTowerName(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Number of Floors</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={newTowerFloors}
                  onChange={(e) => setNewTowerFloors(Number(e.target.value))}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900"
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTowerModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <PremiumButton type="submit" variant="primary">
                  Seed Tower
                </PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
