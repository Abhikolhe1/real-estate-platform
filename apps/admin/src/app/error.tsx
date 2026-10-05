'use client';
export default function ErrorPage({reset}: {reset: () => void}) { return <div role="alert" className="p-10"><h1 className="text-xl">This page could not load</h1><p className="my-4">Please try again.</p><button onClick={reset} className="rounded-lg border px-5 py-3">Try again</button></div>; }
