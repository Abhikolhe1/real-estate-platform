'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { builderUrl, getBuilder, publicJson } from '@/lib/public-data';
import { PageSkeleton } from './page-skeleton';

type Unit = { id: string; flatNumber: string; type: string; sizeSqFt: number; price: number | string; status: string; orientation?: string; description?: string; floorNumber: number; towerId: string; towerName: string };
type Tower = { id: string; name: string; description?: string; floors?: { floorNumber: number; flats?: Unit[] }[] };
const statusName: Record<string, string> = { AVAILABLE: 'Available', HOLD: 'On hold', BOOKED: 'Booked' };
const price = (value: number | string) => Number.isFinite(Number(value)) && Number(value) > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value)) : 'Price on request';

export default function LiveInventory({ unitId }: { unitId?: string }) {
  const params = useSearchParams(), slug = params.get('builder') || 'aethelgard';
  const [towers, setTowers] = useState<Tower[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [towerId, setTowerId] = useState(''), [filter, setFilter] = useState('All'), [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setTowers([]); setSelectedId(''); setFilter('All');
    (async () => {
      try {
        const builder = await getBuilder(slug);
        if (!builder?.id) throw new Error('This builder could not be found.');
        const data = await publicJson<Tower[]>('/inventory/towers', builder.id);
        if (!Array.isArray(data)) throw new Error('Inventory could not be loaded.');
        if (active) { setTowers(data); setTowerId(data[0]?.id || ''); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Inventory could not load.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [slug, retry]);
  const allUnits = useMemo(() => towers.flatMap(tower => (tower.floors || []).flatMap(floor => (floor.flats || []).map(unit => ({ ...unit, floorNumber: floor.floorNumber, towerId: tower.id, towerName: tower.name })))), [towers]);
  const configurations = Array.from(new Set(allUnits.filter(unit => unit.towerId === towerId).map(unit => unit.type).filter(Boolean)));
  const units = allUnits.filter(unit => unit.towerId === towerId && (filter === 'All' || unit.type === filter));
  const selected = unitId ? allUnits.find(unit => unit.id === unitId) : units.find(unit => unit.id === selectedId) || units[0];
  const href = (path: string) => builderUrl(path, slug);
  if (loading) return <PageSkeleton label="Loading available homes" />;
  if (error) return <div role="alert" className="mx-auto max-w-lg p-10 text-center"><h1 className="text-2xl">Inventory is unavailable</h1><p className="my-5 text-white/60">{error}</p><button className="rounded-lg border border-white/30 px-5 py-3" onClick={() => setRetry(value => value + 1)}>Try again</button></div>;
  if (unitId && !selected) return <div className="p-10"><h1 className="text-2xl">This home could not be found</h1><p className="my-4 text-white/60">It may no longer be listed by this builder.</p><Link href={href('/inventory')} className="text-primary underline">View available homes</Link></div>;
  return <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
    <header className="mb-8"><p className="text-xs uppercase tracking-[.2em] text-primary">Property availability</p><h1 className="mt-3 text-3xl">{unitId ? `Home ${selected?.flatNumber}` : 'Find your next home'}</h1><p className="mt-3 text-sm text-white/55">Explore the builder’s listed homes, prices, and current availability.</p>{unitId && <Link href={href('/inventory')} className="mt-4 inline-block text-sm text-primary underline">Back to all homes</Link>}</header>
    {!towers.length ? <div className="rounded-2xl border border-white/10 p-10 text-center"><h2 className="text-xl">No homes published yet</h2><p className="mt-3 text-sm text-white/50">Check back soon or contact the builder for upcoming releases.</p><Link href={href('/contact')} className="mt-5 inline-block text-primary underline">Contact the builder</Link></div> : <div className={`grid gap-7 ${unitId ? '' : 'lg:grid-cols-[260px_minmax(0,1fr)]'}`}>
      {!unitId && <aside aria-label="Inventory filters" className="space-y-6"><div><h2 className="mb-3 text-xs uppercase tracking-widest text-white/50">Choose a tower</h2><div className="space-y-2">{towers.map(tower => <button key={tower.id} onClick={() => { setTowerId(tower.id); setFilter('All'); setSelectedId(''); }} aria-pressed={towerId === tower.id} className={`w-full rounded-xl border p-4 text-left ${towerId === tower.id ? 'border-primary/60 bg-primary/10' : 'border-white/10 hover:border-white/30'}`}><span className="block text-sm font-medium">{tower.name}</span><span className="mt-2 block text-xs text-white/45">{allUnits.filter(unit => unit.towerId === tower.id && unit.status === 'AVAILABLE').length} available</span></button>)}</div></div><div><label htmlFor="unit-configuration" className="mb-3 block text-xs uppercase tracking-widest text-white/50">Configuration</label><select id="unit-configuration" value={filter} onChange={e => { setFilter(e.target.value); setSelectedId(''); }} className="w-full rounded-lg border border-white/20 bg-[#202628] p-3 text-sm"><option>All</option>{configurations.map(value => <option key={value}>{value}</option>)}</select></div></aside>}
      <div className="min-w-0 space-y-6">
        {selected && <section aria-label="Selected home" className="rounded-2xl border border-primary/25 bg-white/[.03] p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-white/50">{selected.towerName} · Floor {selected.floorNumber}</p><h2 className="mt-2 text-2xl">Home {selected.flatNumber}</h2></div><span className={`rounded-full px-3 py-1 text-xs ${selected.status === 'AVAILABLE' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{statusName[selected.status] || selected.status}</span></div><dl className="my-6 grid grid-cols-2 gap-5 md:grid-cols-3"><div><dt className="text-xs text-white/45">Configuration</dt><dd className="mt-2">{selected.type || 'Not specified'}</dd></div><div><dt className="text-xs text-white/45">Area</dt><dd className="mt-2">{selected.sizeSqFt ? `${Number(selected.sizeSqFt).toLocaleString('en-IN')} sq ft` : 'Not specified'}</dd></div><div><dt className="text-xs text-white/45">Listed price</dt><dd className="mt-2 text-primary">{price(selected.price)}</dd></div></dl>{selected.description && <p className="mb-5 text-sm text-white/60">{selected.description}</p>}<div className="flex flex-wrap gap-3"><Link href={href(`/contact?unit=${encodeURIComponent(selected.flatNumber)}`)} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-black">Enquire about this home</Link>{!unitId && <Link href={href(`/inventory/${selected.id}`)} className="rounded-lg border border-white/20 px-5 py-3 text-sm">View details</Link>}<Link href={href('/explorer')} className="rounded-lg border border-white/20 px-5 py-3 text-sm">Open 3D explorer</Link></div></section>}
        {!unitId && <section aria-label="Available homes"><div className="mb-4 text-sm text-white/55">{units.length} {units.length === 1 ? 'home' : 'homes'} listed</div>{!units.length ? <p className="rounded-xl border border-white/10 p-8 text-sm text-white/50">No homes match this configuration.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{units.map(unit => <button key={unit.id} onClick={() => setSelectedId(unit.id)} aria-pressed={selected?.id === unit.id} className={`rounded-xl border p-5 text-left transition-colors ${selected?.id === unit.id ? 'border-primary bg-primary/5' : 'border-white/10 hover:bg-white/5'}`}><span className="flex flex-wrap justify-between gap-2"><strong className="font-medium">Home {unit.flatNumber}</strong><span className="text-xs text-white/45">{statusName[unit.status] || unit.status}</span></span><span className="mt-3 block text-xs text-white/55">{unit.type} · {Number(unit.sizeSqFt).toLocaleString('en-IN')} sq ft</span><span className="mt-5 block text-sm text-primary">{price(unit.price)}</span></button>)}</div>}</section>}
      </div>
    </div>}
  </div>;
}
