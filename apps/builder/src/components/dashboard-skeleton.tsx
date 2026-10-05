export default function DashboardSkeleton() {
 return <div role="status" aria-label="Loading workspace" className="min-h-[60vh] space-y-6 p-6"><span className="sr-only">Loading workspace</span><div className="h-8 w-56 rounded-lg bg-slate-400/15 motion-safe:animate-pulse" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0,1,2,3].map(i=><div key={i} className="h-28 rounded-xl bg-slate-400/15 motion-safe:animate-pulse" />)}</div><div className="h-72 rounded-xl bg-slate-400/15 motion-safe:animate-pulse" /></div>;
}
