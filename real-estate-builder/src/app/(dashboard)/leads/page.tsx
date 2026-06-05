'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { gsap } from 'gsap';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'NEW' | 'CONTACTED' | 'WARM' | 'HOT' | 'CLOSED';
  notes?: string;
  project?: { name: string; id: string };
  createdAt: string;
}

const PIPELINE_STAGES: { key: Lead['status']; label: string; color: string; bg: string; icon: string }[] = [
  { key: 'NEW', label: 'New Leads', color: 'text-gray-600', bg: 'bg-gray-100', icon: '📥' },
  { key: 'CONTACTED', label: 'Contacted', color: 'text-blue-600', bg: 'bg-blue-50', icon: '📞' },
  { key: 'WARM', label: 'Warm', color: 'text-amber-600', bg: 'bg-amber-50', icon: '🔆' },
  { key: 'HOT', label: 'Hot 🔥', color: 'text-red-600', bg: 'bg-red-50', icon: '🔥' },
  { key: 'CLOSED', label: 'Closed ✅', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
];

const TENANT_ID = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

export default function LeadsCRMPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || TENANT_ID;
  const getHeaders = () => ({
    'x-tenant-id': tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusInput, setStatusInput] = useState<Lead['status']>('NEW');
  const [notesInput, setNotesInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', notes: '' });

  const fetchLeads = async () => {
    try {
      const res = await fetch('http://localhost:3001/leads', { headers: getHeaders() });
      if (res.ok) setLeads(await res.json());
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.lead-item', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' });
    }
  }, [loading, viewMode, statusFilter]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.email.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search);
      const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const handleOpenEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setStatusInput(lead.status);
    setNotesInput(lead.notes || '');
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:3001/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ status: statusInput, notes: notesInput }),
      });
      if (res.ok) { setSelectedLead(null); fetchLeads(); }
    } catch { } finally { setIsSaving(false); }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Remove this lead from your CRM?')) return;
    try {
      await fetch(`http://localhost:3001/leads/${id}`, { method: 'DELETE', headers: getHeaders() });
      fetchLeads();
    } catch { }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:3001/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ ...addForm, builderSlug: 'aethelgard' }),
      });
      setShowAddModal(false);
      setAddForm({ name: '', email: '', phone: '', notes: '' });
      fetchLeads();
    } catch { }
  };

  const handleQuickStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      await fetch(`http://localhost:3001/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchLeads();
    } catch { }
  };

  const stage = (status: Lead['status']) => PIPELINE_STAGES.find(s => s.key === status);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading CRM...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Sales Leads CRM</h1>
          <p className="text-gray-400 text-sm mt-1">Track, qualify, and convert property inquiries across all pipeline stages.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1">
            <button onClick={() => setViewMode('table')} className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${viewMode === 'table' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>Table</button>
            <button onClick={() => setViewMode('kanban')} className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${viewMode === 'kanban' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>Kanban</button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition shadow-sm">
            + Add Lead
          </button>
        </div>
      </header>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-5 gap-3">
        {PIPELINE_STAGES.map(stage => {
          const count = leads.filter(l => l.status === stage.key).length;
          return (
            <div
              key={stage.key}
              onClick={() => setStatusFilter(statusFilter === stage.key ? 'ALL' : stage.key)}
              className={`cursor-pointer border rounded-2xl p-4 text-center transition-all duration-200 ${
                statusFilter === stage.key ? 'border-gray-900 shadow-md scale-[1.02]' : 'border-gray-100 bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <span className="text-xl">{stage.icon}</span>
              <p className={`text-2xl font-black mt-2 ${stage.color}`}>{count}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{stage.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search + Status Filter */}
      <div className="flex gap-3 items-center flex-wrap">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-400 w-72"
        />
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${statusFilter === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}
        >
          All ({leads.length})
        </button>
        <span className="ml-auto text-xs font-bold text-gray-400">{filteredLeads.length} leads</span>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="py-3.5 px-5 text-left">Client</th>
                <th className="py-3.5 px-5 text-left">Contact</th>
                <th className="py-3.5 px-5 text-left">Project</th>
                <th className="py-3.5 px-5 text-left">Pipeline</th>
                <th className="py-3.5 px-5 text-left">Notes</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLeads.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-xs text-gray-400">No leads found.</td></tr>
              ) : (
                filteredLeads.map(lead => {
                  const s = stage(lead.status);
                  return (
                    <tr key={lead.id} className="lead-item hover:bg-gray-50/40 transition">
                      <td className="py-4 px-5">
                        <p className="font-bold text-gray-900 text-sm">{lead.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-xs text-gray-600">{lead.phone}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{lead.email}</p>
                      </td>
                      <td className="py-4 px-5 text-xs font-semibold text-gray-600">
                        {lead.project?.name || '—'}
                      </td>
                      <td className="py-4 px-5">
                        <select
                          value={lead.status}
                          onChange={e => handleQuickStatusChange(lead.id, e.target.value as Lead['status'])}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border-0 focus:outline-none cursor-pointer ${s?.bg} ${s?.color}`}
                        >
                          {PIPELINE_STAGES.map(st => (
                            <option key={st.key} value={st.key}>{st.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-5 text-xs text-gray-400 max-w-[180px] truncate">
                        {lead.notes || '—'}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex gap-2 justify-end">
                          <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold hover:bg-emerald-100 transition"
                            title="WhatsApp"
                          >
                            💬
                          </a>
                          <button onClick={() => handleOpenEdit(lead)} className="px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-[11px] font-bold hover:bg-gray-100 transition">
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteLead(lead.id)} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-100 transition">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-5 gap-4">
          {PIPELINE_STAGES.map(stageItem => {
            const stageLeads = filteredLeads.filter(l => l.status === stageItem.key);
            return (
              <div key={stageItem.key} className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
                <div className={`px-4 py-3 border-b border-gray-100 ${stageItem.bg}`}>
                  <div className="flex justify-between items-center">
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${stageItem.color}`}>{stageItem.icon} {stageItem.label}</p>
                    <span className={`text-[10px] font-black ${stageItem.color}`}>{stageLeads.length}</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[200px]">
                  {stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => handleOpenEdit(lead)}
                      className="lead-item bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:shadow-sm hover:border-gray-200 transition-all"
                    >
                      <p className="font-bold text-gray-900 text-xs">{lead.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{lead.phone}</p>
                      {lead.project?.name && (
                        <p className="text-[9px] text-gray-400 mt-1.5 bg-gray-50 px-2 py-0.5 rounded-full inline-block">
                          🏗️ {lead.project.name}
                        </p>
                      )}
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <p className="text-[10px] text-gray-300 text-center py-6">No leads</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Lead Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Update Lead</h3>
            <p className="text-xs text-gray-400 mb-6">{selectedLead.name} · {selectedLead.phone} · {selectedLead.email}</p>
            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Pipeline Status</label>
                <select
                  value={statusInput}
                  onChange={e => setStatusInput(e.target.value as Lead['status'])}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-900 transition"
                >
                  {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Sales Notes</label>
                <textarea
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  placeholder="Client wants 3BHK with sea view, budget ₹2.5 Cr..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setSelectedLead(null)} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:bg-gray-50 rounded-xl transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add New Lead</h3>
            <p className="text-xs text-gray-400 mb-6">Manually add a client inquiry to your CRM pipeline.</p>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Client Name *</label>
                <input required type="text" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Priya Mehta" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Phone *</label>
                  <input required type="text" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Email *</label>
                  <input required type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="priya@email.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Notes</label>
                <textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} placeholder="Interested in 2BHK..." rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition resize-none" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:bg-gray-50 rounded-xl transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition">Add Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
