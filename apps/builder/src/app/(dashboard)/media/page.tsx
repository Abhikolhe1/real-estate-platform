'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { gsap } from 'gsap';

interface MediaAsset {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  createdAt: string;
}

const FILE_ICONS: Record<string, string> = {
  'glb': '📦',
  'gltf': '📦',
  'pdf': '📄',
  'png': '🖼️',
  'jpg': '🖼️',
  'jpeg': '🖼️',
  'mp4': '🎬',
  'webp': '🖼️',
};

const getFileIcon = (fileName: string, fileType: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || FILE_ICONS[fileType] || '📎';
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

type FileCategory = 'ALL' | '3D Models' | 'Images' | 'Documents' | 'Video';

const getCategory = (fileName: string): FileCategory => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['glb', 'gltf', 'obj'].includes(ext)) return '3D Models';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'Images';
  if (['pdf', 'doc', 'docx'].includes(ext)) return 'Documents';
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'Video';
  return 'ALL';
};

export default function MediaAssetsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<FileCategory>('ALL');
  const [search, setSearch] = useState('');
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getHeaders = () => ({
    'x-tenant-id': user?.tenantId || '',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const fetchAssets = async () => {
    if (!token || !user?.tenantId) { setLoading(false); return; }
    try {
      const res = await fetch('http://localhost:3001/media', { headers: getHeaders() });
      if (res.ok) setAssets(await res.json());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchAssets(); }, [token, user]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(containerRef.current.querySelectorAll('.asset-card'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' }
      );
    }
  }, [loading, assets, categoryFilter]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleUploadFile = async (file: File) => {
    if (!token || !user?.tenantId) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    // Simulate progress
    const interval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 200);

    try {
      const res = await fetch('http://localhost:3001/media/upload', {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });
      clearInterval(interval);
      setUploadProgress(100);
      if (res.ok) {
        setTimeout(() => { setUploadProgress(0); setUploading(false); fetchAssets(); }, 600);
      } else {
        setUploading(false);
      }
    } catch { clearInterval(interval); setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleUploadFile(e.dataTransfer.files[0]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this media asset permanently?')) return;
    try {
      const res = await fetch(`http://localhost:3001/media/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) setAssets(prev => prev.filter(a => a.id !== id));
    } catch { }
  };

  const copyUrl = (asset: MediaAsset) => {
    navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = a.fileName.toLowerCase().includes(search.toLowerCase());
      const cat = getCategory(a.fileName);
      const matchCat = categoryFilter === 'ALL' || cat === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [assets, search, categoryFilter]);

  const totalSize = assets.reduce((s, a) => s + a.fileSize, 0);
  const categoryCounts = {
    'ALL': assets.length,
    '3D Models': assets.filter(a => getCategory(a.fileName) === '3D Models').length,
    'Images': assets.filter(a => getCategory(a.fileName) === 'Images').length,
    'Documents': assets.filter(a => getCategory(a.fileName) === 'Documents').length,
    'Video': assets.filter(a => getCategory(a.fileName) === 'Video').length,
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Media Library...</p>
      </div>
    </div>
  );

  if (!user?.tenantId) return (
    <div className="flex justify-center items-center min-h-[50vh] text-center">
      <div>
        <p className="text-gray-500 font-bold">Please log in as a Builder Admin to access media uploads.</p>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Media Library</h1>
          <p className="text-gray-400 text-sm mt-1">Upload and manage 3D GLB models, property renders, blueprints, and documents.</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-xs text-gray-400 font-bold">{formatBytes(totalSize)} used</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition shadow-sm"
          >
            ↑ Upload File
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: '📦', label: '3D Models', value: categoryCounts['3D Models'], color: 'bg-purple-50' },
          { icon: '🖼️', label: 'Images', value: categoryCounts['Images'], color: 'bg-blue-50' },
          { icon: '📄', label: 'Documents', value: categoryCounts['Documents'], color: 'bg-amber-50' },
          { icon: '🎬', label: 'Videos', value: categoryCounts['Video'], color: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-xl`}>{s.icon}</div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dropzone */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={e => e.target.files?.[0] && handleUploadFile(e.target.files[0])}
        className="hidden"
        accept=".glb,.gltf,.jpg,.jpeg,.png,.pdf,.webp,.mp4"
      />
      <div
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          dragActive ? 'border-gray-900 bg-gray-50 scale-[1.01]' : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50/50'
        } ${uploading ? 'pointer-events-none' : ''}`}
      >
        {uploading ? (
          <div className="w-full max-w-xs">
            <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-gray-700 mb-2">Uploading...</p>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-gray-900 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <span className="text-3xl">{dragActive ? '✨' : '📁'}</span>
            <p className="font-bold text-gray-700 mt-3 text-sm">{dragActive ? 'Drop to upload' : 'Drag & drop or click to upload'}</p>
            <p className="text-[10px] text-gray-400 mt-1">Supports GLB, GLTF, JPG, PNG, PDF, MP4 · Max 100MB</p>
          </>
        )}
      </div>

      {/* Category Filter + Search */}
      <div className="flex gap-3 items-center flex-wrap">
        {(['ALL', '3D Models', 'Images', 'Documents', 'Video'] as FileCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              categoryFilter === cat ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {cat} ({categoryCounts[cat] ?? 0})
          </button>
        ))}
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-400 w-48"
        />
        <span className="text-xs font-bold text-gray-400">{filteredAssets.length} files</span>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-14 flex flex-col items-center gap-3 shadow-sm">
          <span className="text-4xl">📁</span>
          <p className="font-bold text-gray-700">No assets found</p>
          <p className="text-sm text-gray-400">{search ? 'Try a different search term.' : 'Upload your first file to get started.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {filteredAssets.map(asset => {
            const icon = getFileIcon(asset.fileName, asset.fileType);
            const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(asset.fileName.split('.').pop()?.toLowerCase() || '');
            const isCopied = copiedId === asset.id;
            return (
              <div key={asset.id} className="asset-card bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                {/* File Preview */}
                <div className="h-28 bg-gray-50 flex items-center justify-center relative overflow-hidden">
                  {isImage ? (
                    <img
                      src={asset.url}
                      alt={asset.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as any).style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-4xl">{icon}</span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>

                {/* File Info */}
                <div className="p-3.5">
                  <p className="font-bold text-gray-900 text-xs truncate" title={asset.fileName}>{asset.fileName}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(asset.fileSize)} · {new Date(asset.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => copyUrl(asset)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${isCopied ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      {isCopied ? '✓ Copied' : 'Copy URL'}
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="px-2 py-1.5 rounded-lg bg-red-50 text-red-500 text-[11px] font-bold hover:bg-red-100 transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
