'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div role="alert" className="mx-auto max-w-lg px-6 py-24 text-center"><h1 className="text-2xl">This page could not load</h1><p className="my-4 text-white/60">Please try again. Your saved arrangements are still available.</p><button className="rounded-lg border border-white/30 px-5 py-3" onClick={reset}>Try again</button></div>;
}
