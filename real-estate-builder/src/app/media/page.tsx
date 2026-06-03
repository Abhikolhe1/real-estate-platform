'use client';

import React, { useState } from 'react';
import PremiumButton from '@/components/premium-button';

export default function MediaAssetsPage() {
  const [dragActive, setDragActive] = useState(false);
  const [assets, setAssets] = useState([
    { id: '1', name: 'sapphire_sky_penthouse_3d.glb', size: '24.8 MB', type: '3D GLB Model', date: 'June 01, 2026' },
    { id: '2', name: 'Sapphire_Master_Floorplan.pdf', size: '4.2 MB', type: 'PDF Blueprint', date: 'June 01, 2026' },
    { id: '3', name: 'infinity_pool_rendering.jpg', size: '1.8 MB', type: 'Image Asset', date: 'June 01, 2026' },
  ]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const newAsset = {
        id: `${Date.now()}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.name.endsWith('.glb') ? '3D GLB Model' : file.name.endsWith('.pdf') ? 'PDF Blueprint' : 'Image Asset',
        date: 'Today',
      };
      setAssets([newAsset, ...assets]);
    }
  };

  return (
    <div>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Media & Assets Library</h1>
          <p className="text-gray-500 text-sm mt-1">Upload 3D virtual experience GLB walkthrough files, PDF blueprint brochures, and luxury renders.</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-8">
        {/* Upload Card */}
        <section className="col-span-1 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm h-fit">
          <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider mb-6">Dropzone Upload</h3>
          
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] transition duration-300 ${
              dragActive ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:bg-gray-50/50'
            }`}
          >
            <span className="text-3xl">📁</span>
            <h4 className="text-xs font-bold text-gray-800 mt-4">Drag and drop file here</h4>
            <p className="text-[10px] text-gray-400 mt-1">Supports GLB, GLTF, JPG, PNG, PDF</p>
            <span className="text-[9px] text-gray-400 mt-4">Max size: 100MB</span>
          </div>
        </section>

        {/* Assets List */}
        <section className="col-span-2 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider mb-6">Uploaded Library Assets ({assets.length})</h3>

          <div className="flex flex-col gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50/50 transition duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {asset.type.includes('3D') ? '📦' : asset.type.includes('PDF') ? '📄' : '🖼️'}
                  </span>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs">{asset.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{asset.type} • {asset.size}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{asset.date}</p>
                  <button 
                    onClick={() => setAssets(assets.filter(a => a.id !== asset.id))}
                    className="text-[10px] text-red-500 font-bold hover:underline mt-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
