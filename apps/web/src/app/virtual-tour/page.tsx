'use client';

import React, { Suspense } from 'react';
import DynamicPageRenderer from '@/components/dynamic-page-renderer';

export default function VirtualTourPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-stone-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
          <p className="text-xs font-bold text-stone-500 tracking-wider uppercase">Loading Virtual Tour...</p>
        </div>
      </div>
    }>
      <DynamicPageRenderer slug="virtual-tour" />
    </Suspense>
  );
}
