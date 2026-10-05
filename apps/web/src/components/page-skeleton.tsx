export function PageSkeleton({ label = 'Loading page' }: { label?: string }) {
  return <div role="status" aria-label={label} className="mx-auto w-full max-w-6xl space-y-7 px-5 py-10">
    <span className="sr-only">{label}</span>
    <div className="skeleton h-3 w-32 rounded" /><div className="skeleton h-10 w-2/3 max-w-lg rounded-lg" />
    <div className="skeleton h-64 rounded-2xl" />
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="skeleton h-36 rounded-xl" />)}</div>
  </div>;
}

export function ExplorerSkeleton() {
  return <div role="status" aria-label="Loading 3D explorer" className="explorer-placeholder relative overflow-hidden rounded-2xl border border-white/10 bg-[#172124] p-5">
    <div className="skeleton h-5 w-44 rounded" /><div className="skeleton mt-3 h-3 w-64 max-w-full rounded" />
    <div className="mt-7 flex h-[65vh] min-h-[350px] gap-5"><div className="hidden w-52 space-y-5 sm:block">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}</div><div className="skeleton flex flex-1 items-center justify-center rounded-xl text-sm text-white/70">Preparing your property view…</div></div>
  </div>;
}
