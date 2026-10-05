'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { builderUrl, getBuilder, publicJson } from '@/lib/public-data';
import { PageSkeleton } from '@/components/page-skeleton';
function Locations() {
 const params=useSearchParams(),slug=params.get('builder') || 'aethelgard';
 const [projects,setProjects]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setProjects([]);(async()=>{try{const builder=await getBuilder(slug);if(!builder?.id)throw new Error('Builder not found.');const data=await publicJson('/projects',builder.id);if(!Array.isArray(data))throw new Error('Project locations are unavailable.');if(active)setProjects(data);}catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load locations.');}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[slug,retry]);
 if(loading)return <PageSkeleton label="Loading project locations"/>;
 return <div className="mx-auto max-w-5xl px-5 py-10"><h1 className="text-3xl">Location & neighborhood</h1><p className="my-4 text-sm text-white/55">Find the published location of each project and plan your visit.</p>{error?<div role="alert" className="rounded-xl border border-white/10 p-6"><p>{error}</p><button onClick={()=>setRetry(v=>v+1)} className="mt-4 rounded-lg border px-4 py-2">Try again</button></div>:<div className="mt-8 grid gap-5 md:grid-cols-2">{projects.map(project=><article key={project.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="text-xl">{project.name}</h2><p className="mt-3 text-sm text-white/60">{project.location || 'Location details have not been published yet.'}</p><div className="mt-6 flex flex-wrap gap-4">{project.location&&<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.location)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Open map</a>}<Link href={builderUrl('/contact',slug)} className="text-sm text-primary underline">Arrange a visit</Link></div></article>)}{!projects.length&&<p className="text-sm text-white/50">No project locations have been published yet.</p>}</div>}</div>;
}
export default function LocationPage(){return <Suspense fallback={<PageSkeleton/>}><Locations/></Suspense>;}
