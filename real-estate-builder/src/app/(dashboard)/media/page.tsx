'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';

interface MediaAsset {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  createdAt: string;
}

export default function MediaAssetsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    if (!token || !user?.tenantId) return;
    try {
      const res = await fetch('http://localhost:3001/media', {
        headers: {
          'x-tenant-id': user.tenantId,
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (err) {
      console.error('Failed to fetch media assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [token, user]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!token || !user?.tenantId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:3001/media/upload', {
        method: 'POST',
        headers: {
          'x-tenant-id': user.tenantId,
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        await fetchAssets();
      } else {
        alert('Failed to upload file');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !user?.tenantId) return;
    if (!confirm('Are you sure you want to delete this media asset?')) return;

    try {
      const res = await fetch(`http://localhost:3001/media/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': user.tenantId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setAssets(assets.filter((a) => a.id !== id));
      } else {
        alert('Failed to delete asset');
      }
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Asset URL copied to clipboard!');
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Retrieving assets...</p>
      </div>
    );
  }

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
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".glb,.gltf,.jpg,.jpeg,.png,.pdf"
          />
          
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] cursor-pointer transition duration-300 ${
              dragActive ? 'border-amber-500 bg-amber-50/10' : 'border-gray-200 bg-white hover:bg-gray-50/50'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? (
              <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-4"></div>
            ) : (
              <span className="text-3xl">📁</span>
            )}
            <h4 className="text-xs font-bold text-gray-800 mt-4">
              {uploading ? 'Uploading asset file...' : 'Drag and drop file or click to upload'}
            </h4>
            <p className="text-[10px] text-gray-400 mt-1">Supports GLB, GLTF, JPG, PNG, PDF</p>
            <span className="text-[9px] text-gray-400 mt-4">Max size: 100MB</span>
          </div>
        </section>

        {/* Assets List */}
        <section className="col-span-2 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider mb-6">Uploaded Library Assets ({assets.length})</h3>

          <div className="flex flex-col gap-4">
            {assets.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10">No assets uploaded yet.</p>
            ) : (
              assets.map((asset) => (
                <div key={asset.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50/50 transition duration-300">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {asset.fileType.includes('glb') || asset.fileName.endsWith('.glb') ? '📦' : asset.fileType.includes('pdf') ? '📄' : '🖼️'}
                    </span>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">{asset.fileName}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">{asset.fileType} • {formatBytes(asset.fileSize)}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      {new Date(asset.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => copyToClipboard(asset.url)}
                        className="text-[10px] text-amber-500 font-bold hover:underline"
                      >
                        Copy URL
                      </button>
                      <button 
                        onClick={() => handleDelete(asset.id)}
                        className="text-[10px] text-red-500 font-bold hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
