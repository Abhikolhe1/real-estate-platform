'use client';

import React, { useState, useEffect } from 'react';
import PremiumButton from '@/components/premium-button';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'NEW' | 'CONTACTED' | 'WARM' | 'HOT' | 'CLOSED';
  notes?: string;
  project?: { name: string };
  createdAt: string;
}

export default function LeadsCRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusInput, setStatusInput] = useState<'NEW' | 'CONTACTED' | 'WARM' | 'HOT' | 'CLOSED'>('NEW');
  const [notesInput, setNotesInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const tenantId = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2'; // Seeded Aethelgard builder id

  const fetchLeads = async () => {
    try {
      const res = await fetch('http://localhost:3001/leads', {
        headers: { 'x-tenant-id': tenantId },
      });
      const data = await res.json();
      setLeads(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load leads:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

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
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          status: statusInput,
          notes: notesInput,
        }),
      });

      if (res.ok) {
        setSelectedLead(null);
        fetchLeads(); // Reload leads!
      }
      setIsSaving(false);
    } catch (err) {
      console.error('Error saving lead status:', err);
      setIsSaving(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead from your CRM?')) return;
    try {
      const res = await fetch(`http://localhost:3001/leads/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-gray-900 border-t-transparent animate-spin"></div>
          <p className="text-sm font-bold text-gray-500 font-sans">Loading CRM workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Sales Leads CRM</h1>
          <p className="text-gray-500 text-sm mt-1">Track customer acquisition pipeline, log walkthrough feedback, and call clients.</p>
        </div>
      </header>

      {/* Leads Table Card */}
      <section className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Acquisition Pipeline ({leads.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="py-4 px-6">Client Info</th>
                <th className="py-4 px-6">Property Link</th>
                <th className="py-4 px-6">pipeline Status</th>
                <th className="py-4 px-6">Walkthrough Notes</th>
                <th className="py-4 px-6 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-gray-400">
                    No leads captured under this portfolio yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="text-xs hover:bg-gray-50/40 transition">
                    <td className="py-5 px-6">
                      <p className="font-bold text-gray-900 text-sm">{lead.name}</p>
                      <p className="text-gray-400 mt-1">{lead.phone} • {lead.email}</p>
                    </td>
                    <td className="py-5 px-6 font-semibold text-gray-700">
                      {lead.project?.name || 'Aethelgard Sky Penthouses'}
                    </td>
                    <td className="py-5 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                        lead.status === 'HOT' ? 'bg-red-50 text-red-700' :
                        lead.status === 'WARM' ? 'bg-amber-50 text-amber-700' :
                        lead.status === 'CONTACTED' ? 'bg-blue-50 text-blue-700' :
                        lead.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-gray-500 max-w-xs truncate">
                      {lead.notes || 'No sales team notes logged yet.'}
                    </td>
                    <td className="py-5 px-6 text-right flex gap-3 justify-end items-center h-full">
                      <a 
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-gray-900 transition text-sm"
                        title="WhatsApp Contact"
                      >
                        💬
                      </a>
                      <button 
                        onClick={() => handleOpenEdit(lead)}
                        className="text-gray-400 hover:text-gray-950 font-bold"
                        title="Update Status"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteLead(lead.id)}
                        className="text-gray-400 hover:text-red-600 font-bold"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Status Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white border border-gray-150 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-gray-950 mb-2">Update CRM Lead</h3>
            <p className="text-xs text-gray-400 mb-6">Log follow-up comments and pipeline status for {selectedLead.name}.</p>
            <form onSubmit={handleSaveStatus} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Pipeline Status</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as any)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 bg-white"
                >
                  <option value="NEW">New (Uncontacted)</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="WARM">Warm Lead</option>
                  <option value="HOT">Hot Lead</option>
                  <option value="CLOSED">Closed (Won)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Sales Notes & Comments</label>
                <textarea
                  placeholder="Log details here e.g. Customer requested a customized penthouse walkthrough..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 h-24 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <PremiumButton type="submit" variant="primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Follow-up'}
                </PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
