'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/store/authStore';
import { AmenityFactory, AmenityType } from '@/components/scene-compiler/AmenityFactory';

type Project = { id: string; name: string };
type Amenity = {
  id: string;
  type: AmenityType;
  x: number;
  z: number;
  rotation: number;
  label: string;
  description: string;
  imageUrl: string;
  timings: string;
};

const SITE = { width: 60, depth: 40 };
const BUILDING = { width: 16, depth: 16 };
const catalog: Array<{ type: AmenityType; label: string; icon: string; color: string }> = [
  { type: 'swimming_pool', label: 'Swimming Pool', icon: 'solar:waterdrops-bold', color: '#38bdf8' },
  { type: 'gym', label: 'Gym', icon: 'solar:dumbbell-large-bold', color: '#64748b' },
  { type: 'clubhouse', label: 'Clubhouse', icon: 'solar:buildings-2-bold', color: '#b7794b' },
  { type: 'garden', label: 'Garden', icon: 'solar:leaf-bold', color: '#22c55e' },
  { type: 'parking', label: 'Parking', icon: 'solar:garage-bold', color: '#475569' },
  { type: 'kids_play_area', label: 'Kids Play Area', icon: 'solar:balloon-bold', color: '#f43f5e' },
  { type: 'jogging_track', label: 'Jogging Track', icon: 'solar:running-round-bold', color: '#ea580c' },
  { type: 'tennis_court', label: 'Tennis Court', icon: 'solar:tennis-bold', color: '#16a34a' },
];

const byType = new Map(catalog.map((item) => [item.type, item]));
const intersects = (a: { x: number; z: number; width: number; depth: number }, b: typeof a) =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
  Math.abs(a.z - b.z) < (a.depth + b.depth) / 2;

export default function AmenitiesPage() {
  const token = useAuthStore((state) => state.token);
  const tenantId = useAuthStore((state) => state.user?.tenantId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [items, setItems] = useState<Amenity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId || '',
    Authorization: `Bearer ${token}`,
  }), [tenantId, token]);

  useEffect(() => {
    if (!token || !tenantId) return;
    fetch('http://localhost:3001/projects', { headers })
      .then((response) => response.json())
      .then((data: Project[]) => {
        setProjects(data || []);
        if (data?.[0]) setProjectId(data[0].id);
      });
  }, [token, tenantId, headers]);

  useEffect(() => {
    if (!projectId) return;
    fetch(`http://localhost:3001/projects/${projectId}/amenities`, { headers })
      .then((response) => response.json())
      .then((data) => setItems((data || []).map((item: any) => ({
        ...item,
        x: Number(item.x),
        z: Number(item.z),
        rotation: Number(item.rotation || 0),
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        timings: item.timings || '',
      }))));
  }, [projectId, headers]);

  const selected = items.find((item) => item.id === selectedId);
  const validPosition = (candidate: Amenity, ignoredId?: string) => {
    const footprint = AmenityFactory.footprints[candidate.type];
    if (
      Math.abs(candidate.x) + footprint.width / 2 > SITE.width / 2 ||
      Math.abs(candidate.z) + footprint.depth / 2 > SITE.depth / 2
    ) return false;
    if (intersects({ x: candidate.x, z: candidate.z, ...footprint }, { x: 0, z: 0, ...BUILDING })) return false;
    return !items.some((item) => item.id !== ignoredId && intersects(
      { x: candidate.x, z: candidate.z, ...footprint },
      { x: item.x, z: item.z, ...AmenityFactory.footprints[item.type] },
    ));
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width - 0.5) * SITE.width);
    const z = Math.round(((event.clientY - rect.top) / rect.height - 0.5) * SITE.depth);
    const existingId = event.dataTransfer.getData('amenity-id');
    const type = event.dataTransfer.getData('amenity-type') as AmenityType;

    if (existingId) {
      const current = items.find((item) => item.id === existingId);
      if (!current) return;
      const moved = { ...current, x, z };
      if (!validPosition(moved, existingId)) return setMessage('Position overlaps the building, site edge, or another amenity.');
      setItems((all) => all.map((item) => item.id === existingId ? moved : item));
      return setMessage('');
    }

    const definition = byType.get(type);
    if (!definition) return;
    const next: Amenity = {
      id: `draft-${Date.now()}`, type, x, z, rotation: 0, label: definition.label,
      description: '', imageUrl: '', timings: '',
    };
    if (!validPosition(next)) return setMessage('Position overlaps the building, site edge, or another amenity.');
    setItems((all) => [...all, next]);
    setSelectedId(next.id);
    setMessage('');
  };

  const updateSelected = (patch: Partial<Amenity>) => {
    setItems((all) => all.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
  };

  const save = async () => {
    setSaving(true);
    const response = await fetch(`http://localhost:3001/projects/${projectId}/amenities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amenities: items.map(({ id: _id, ...item }) => item) }),
    });
    if (response.ok) {
      setItems(await response.json());
      setSelectedId(null);
      setMessage('Amenity layout saved.');
    } else {
      setMessage('Unable to save amenity layout.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Phase 7 Site Design</p>
          <h1 className="text-2xl font-black text-gray-950">Amenities Site Plan</h1>
          <p className="text-sm text-gray-400">Drag amenities onto the 1m grid and save the project layout.</p>
        </div>
        <div className="flex gap-2">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-xl border px-4 py-2 text-xs font-bold">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <button onClick={save} disabled={!projectId || saving} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Layout'}
          </button>
        </div>
      </header>
      {message && <p className="rounded-xl bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-700">{message}</p>}

      <div className="grid min-h-[620px] grid-cols-[200px_minmax(0,1fr)_250px] overflow-hidden rounded-3xl border bg-white shadow-sm">
        <aside className="space-y-2 border-r p-4">
          <p className="pb-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Amenity Library</p>
          {catalog.map((item) => {
            const footprint = AmenityFactory.footprints[item.type];
            return (
              <div key={item.type} draggable onDragStart={(event) => event.dataTransfer.setData('amenity-type', item.type)}
                className="flex cursor-grab items-center gap-2 rounded-xl border p-3 hover:bg-indigo-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: item.color }}>
                  <Icon icon={item.icon} />
                </span>
                <span><b className="block text-[11px]">{item.label}</b><small className="text-gray-400">{footprint.width}m x {footprint.depth}m</small></span>
              </div>
            );
          })}
        </aside>

        <main className="flex flex-col bg-gray-50 p-5">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">60m x 40m site</p>
          <div onDragOver={(event) => event.preventDefault()} onDrop={onDrop}
            className="relative flex-1 overflow-hidden rounded-2xl border-2 border-dashed bg-[#eef2e8]"
            style={{ backgroundImage: 'linear-gradient(#64748b18 1px,transparent 1px),linear-gradient(90deg,#64748b18 1px,transparent 1px)', backgroundSize: `${100 / SITE.width}% ${100 / SITE.depth}%` }}>
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-gray-500 text-[9px] font-black text-white"
              style={{ width: `${BUILDING.width / SITE.width * 100}%`, height: `${BUILDING.depth / SITE.depth * 100}%` }}>MAIN BUILDING</div>
            {items.map((item) => {
              const footprint = AmenityFactory.footprints[item.type];
              const definition = byType.get(item.type)!;
              return (
                <button key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData('amenity-id', item.id)}
                  onClick={() => setSelectedId(item.id)}
                  className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-move flex-col items-center justify-center rounded-lg border-2 text-white shadow ${selectedId === item.id ? 'border-indigo-700 ring-4 ring-indigo-400/30' : 'border-white'}`}
                  style={{ left: `${(item.x + SITE.width / 2) / SITE.width * 100}%`, top: `${(item.z + SITE.depth / 2) / SITE.depth * 100}%`, width: `${footprint.width / SITE.width * 100}%`, height: `${footprint.depth / SITE.depth * 100}%`, background: definition.color, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}>
                  <Icon icon={definition.icon} /><span className="text-[8px] font-black">{item.label}</span>
                </button>
              );
            })}
          </div>
        </main>

        <aside className="border-l p-4">
          <p className="mb-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Selected Amenity</p>
          {!selected ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-gray-400">Select an amenity to edit it.</p> : (
            <div className="space-y-3">
              {[
                ['Label', 'label'], ['Timings', 'timings'], ['Image URL', 'imageUrl'],
              ].map(([label, key]) => (
                <label key={key} className="block text-[9px] font-bold uppercase text-gray-400">{label}
                  <input value={(selected as any)[key]} onChange={(event) => updateSelected({ [key]: event.target.value })}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-xs normal-case text-gray-900" />
                </label>
              ))}
              <label className="block text-[9px] font-bold uppercase text-gray-400">Description
                <textarea value={selected.description} onChange={(event) => updateSelected({ description: event.target.value })}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-xs normal-case text-gray-900" rows={4} />
              </label>
              <label className="block text-[9px] font-bold uppercase text-gray-400">Rotation
                <input type="range" min={0} max={270} step={90} value={selected.rotation}
                  onChange={(event) => updateSelected({ rotation: Number(event.target.value) })} className="mt-2 w-full" />
              </label>
              <p className="rounded-lg bg-gray-50 p-2 text-[10px] font-bold text-gray-500">X {selected.x}m, Z {selected.z}m</p>
              <button onClick={() => { setItems((all) => all.filter((item) => item.id !== selected.id)); setSelectedId(null); }}
                className="w-full rounded-xl border border-red-200 py-2 text-[10px] font-black uppercase text-red-500">Remove</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
