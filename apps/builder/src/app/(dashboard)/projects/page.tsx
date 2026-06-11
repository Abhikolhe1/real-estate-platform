'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { gsap } from 'gsap';

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location?: string;
  status: 'PLANNING' | 'UNDER_CONSTRUCTION' | 'READY' | 'SOLD_OUT';
  createdAt: string;
  exteriorConfig?: {
    facadeType?: 'Concrete' | 'Brick' | 'Glass' | 'Stone' | 'Sandstone';
    customTextureUrl?: string;
  };
}

const STATUS_BADGES: Record<string, string> = {
  PLANNING: 'bg-purple-50 text-purple-700 border-purple-100',
  UNDER_CONSTRUCTION: 'bg-amber-50 text-amber-700 border-amber-100',
  READY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  SOLD_OUT: 'bg-gray-100 text-gray-500 border-gray-200',
};

const TENANT_ID = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

export default function ProjectsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || TENANT_ID;
  const headers = () => ({ 'x-tenant-id': tenantId, ...(token ? { Authorization: `Bearer ${token}` } : {}) });

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'details' | 'appearance'>('details');
  const [uploadingTexture, setUploadingTexture] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    location: '',
    description: '',
    status: 'PLANNING' as Project['status'],
    exteriorConfig: {
      facadeType: 'Concrete' as NonNullable<NonNullable<Project['exteriorConfig']>['facadeType']>,
      customTextureUrl: ''
    }
  });

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:3001/projects', { headers: headers() });
      if (res.ok) setProjects(await res.json());
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.proj-card', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
    }
  }, [loading]);

  const openAdd = () => {
    setEditProject(null);
    setFormData({
      name: '',
      slug: '',
      location: '',
      description: '',
      status: 'PLANNING',
      exteriorConfig: { facadeType: 'Concrete', customTextureUrl: '' }
    });
    setActiveTab('details');
    setShowModal(true);
  };

  const openEdit = (p: Project) => {
    setEditProject(p);
    setFormData({
      name: p.name,
      slug: p.slug,
      location: p.location || '',
      description: p.description || '',
      status: p.status,
      exteriorConfig: {
        facadeType: p.exteriorConfig?.facadeType || 'Concrete',
        customTextureUrl: p.exteriorConfig?.customTextureUrl || ''
      }
    });
    setActiveTab('details');
    setShowModal(true);
  };

  const handleTextureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileFormData = new FormData();
    fileFormData.append('file', file);

    setUploadingTexture(true);
    try {
      const res = await fetch('http://localhost:3001/media/upload', {
        method: 'POST',
        headers: {
          'x-tenant-id': tenantId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: fileFormData
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(f => ({
          ...f,
          exteriorConfig: {
            ...f.exteriorConfig,
            customTextureUrl: data.url
          }
        }));
      } else {
        alert('Failed to upload custom texture. Check image size (<5MB) and format.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading custom texture.');
    } finally {
      setUploadingTexture(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...formData, slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-') };
    try {
      const url = editProject ? `http://localhost:3001/projects/${editProject.id}` : 'http://localhost:3001/projects';
      const res = await fetch(url, {
        method: editProject ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify(payload),
      });
      if (res.ok) { setShowModal(false); fetchProjects(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? All towers, floors, and flats will also be removed.')) return;
    try {
      await fetch(`http://localhost:3001/projects/${id}`, { method: 'DELETE', headers: headers() });
      fetchProjects();
    } catch { }
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.location || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Projects...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Projects Portfolio</h1>
          <p className="text-gray-400 text-sm mt-1">Manage all property development projects, status, and details.</p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition shadow-sm flex items-center gap-2"
        >
          <span>+</span> New Project
        </button>
      </header>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <input
          type="text"
          placeholder="Search by name or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-400 w-64"
        />
        {['ALL', 'PLANNING', 'UNDER_CONSTRUCTION', 'READY', 'SOLD_OUT'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              statusFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
        <span className="ml-auto text-xs font-bold text-gray-400">{filtered.length} projects</span>
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 flex flex-col items-center gap-3 shadow-sm">
          <span className="text-4xl">🏗️</span>
          <p className="font-bold text-gray-700">No projects found</p>
          <p className="text-sm text-gray-400">{search ? 'Try a different search query.' : 'Click "+ New Project" to create your first property.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {filtered.map(project => (
            <div key={project.id} className="proj-card bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">🏗️</div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGES[project.status]}`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{project.name}</h3>
              {project.location && (
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <span>📍</span> {project.location}
                </p>
              )}
              {project.description && (
                <p className="text-[11px] text-gray-500 mt-2 line-clamp-2 leading-relaxed">{project.description}</p>
              )}
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-mono">/{project.slug}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(project)}
                    className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-gray-300 mt-2 font-mono">Created {new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-7 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{editProject ? 'Edit Project' : 'Create New Project'}</h3>
            <p className="text-xs text-gray-400 mb-4">{editProject ? `ID: ${editProject.id}` : 'Add a new real estate project to your portfolio.'}</p>
            
            {/* Modal Tabs */}
            <div className="flex gap-4 border-b border-gray-100 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`pb-2 px-1 text-xs font-bold border-b-2 transition ${
                  activeTab === 'details' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Project Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`pb-2 px-1 text-xs font-bold border-b-2 transition ${
                  activeTab === 'appearance' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Building Appearance
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'details' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Project Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(f => ({
                        ...f,
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                      }))}
                      placeholder="e.g. Grand Central Residences"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">URL Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={e => setFormData(f => ({ ...f, slug: e.target.value }))}
                      placeholder="grand-central"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-gray-900 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Location *</label>
                    <input
                      required
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Bandra, Mumbai"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Project Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData(f => ({ ...f, status: e.target.value as Project['status'] }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-900 transition"
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="UNDER_CONSTRUCTION">Under Construction</option>
                      <option value="READY">Ready to Move</option>
                      <option value="SOLD_OUT">Sold Out</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                      placeholder="Luxury residential development with premium amenities..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Facade Material Theme</label>
                    <select
                      value={formData.exteriorConfig.facadeType}
                      onChange={e => setFormData(f => ({
                        ...f,
                        exteriorConfig: {
                          ...f.exteriorConfig,
                          facadeType: e.target.value as any
                        }
                      }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-900 transition"
                    >
                      <option value="Concrete">Concrete (Default)</option>
                      <option value="Brick">Brick Facade</option>
                      <option value="Glass">Glass Curtain</option>
                      <option value="Stone">Stone Veneer</option>
                      <option value="Sandstone">Sandstone Plaster</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Custom Facade Texture Image</label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleTextureUpload}
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer cursor-pointer border border-gray-200 p-2 rounded-xl"
                    />
                    {uploadingTexture && <p className="text-[10px] text-amber-600 font-bold mt-1 animate-pulse">Uploading custom texture...</p>}
                    {formData.exteriorConfig.customTextureUrl && (
                      <div className="mt-2 flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-white">
                          <img src={formData.exteriorConfig.customTextureUrl} alt="custom texture preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="text-[10px] font-bold text-gray-700 truncate">Texture Uploaded</p>
                          <p className="text-[9px] text-gray-400 truncate font-mono">{formData.exteriorConfig.customTextureUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(f => ({
                            ...f,
                            exteriorConfig: {
                              ...f.exteriorConfig,
                              customTextureUrl: ''
                            }
                          }))}
                          className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:bg-gray-50 rounded-xl transition">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingTexture}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
