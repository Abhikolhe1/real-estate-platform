'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { gsap } from 'gsap';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_BADGES: Record<string, string> = {
  BUILDER_ADMIN: 'bg-purple-50 text-purple-700 border-purple-100',
  BUILDER_STAFF: 'bg-blue-50 text-blue-700 border-blue-100',
  SALES_USER: 'bg-amber-50 text-amber-700 border-amber-100',
  SUPER_ADMIN: 'bg-red-50 text-red-700 border-red-100',
};

const ROLE_ICONS: Record<string, string> = {
  BUILDER_ADMIN: '👑',
  BUILDER_STAFF: '🧑‍💼',
  SALES_USER: '🤝',
  SUPER_ADMIN: '🛡️',
};

export default function TeamPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const getHeaders = () => ({
    'x-tenant-id': user?.tenantId || '',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'BUILDER_STAFF',
  });

  const fetchTeam = async () => {
    try {
      const res = await fetch('http://localhost:3001/users/team', { headers: getHeaders() });
      if (res.ok) setMembers(await res.json());
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.member-card', { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.35, stagger: 0.06, ease: 'back.out(1.2)' });
    }
  }, [loading]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('http://localhost:3001/users/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'BUILDER_STAFF' });
        fetchTeam();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create team member');
      }
    } catch { } finally { setSaving(false); }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`http://localhost:3001/users/team/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchTeam();
    } catch { }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this team member from your workspace?')) return;
    try {
      await fetch(`http://localhost:3001/users/team/${id}`, { method: 'DELETE', headers: getHeaders() });
      fetchTeam();
    } catch { }
  };

  const getInitials = (first: string, last: string) => `${first?.[0] || '?'}${last?.[0] || ''}`.toUpperCase();
  const avatarColors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-red-500'];
  const getColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Team...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Team Members</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your builder staff, sales team, and access permissions.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition shadow-sm"
        >
          + Invite Member
        </button>
      </header>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: members.length, icon: '👥' },
          { label: 'Admins', value: members.filter(m => m.role === 'BUILDER_ADMIN').length, icon: '👑' },
          { label: 'Sales Team', value: members.filter(m => m.role === 'SALES_USER').length, icon: '🤝' },
          { label: 'Active', value: members.filter(m => m.isActive).length, icon: '✅' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 flex flex-col items-center gap-3 shadow-sm">
          <span className="text-5xl">👥</span>
          <p className="font-bold text-gray-700">No team members yet</p>
          <p className="text-sm text-gray-400">Invite your sales agents, property managers, and staff.</p>
          <button onClick={() => setShowModal(true)} className="mt-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition">
            + Invite First Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {members.map(member => (
            <div key={member.id} className={`member-card bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 ${member.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${getColor(member.firstName)} text-white flex items-center justify-center font-black text-sm shadow-sm`}>
                    {getInitials(member.firstName, member.lastName)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{member.email}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${member.isActive ? 'bg-emerald-400' : 'bg-gray-300'}`} />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_BADGES[member.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {ROLE_ICONS[member.role]} {member.role.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-50">
                <button
                  onClick={() => handleToggleActive(member.id, member.isActive)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    member.isActive ? 'bg-gray-50 text-gray-500 hover:bg-gray-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {member.isActive ? 'Deactivate' : 'Activate'}
                </button>
                {user?.id !== member.id && (
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-500 hover:bg-red-100 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[9px] text-gray-300 mt-2 font-mono">
                Joined {new Date(member.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Invite Team Member</h3>
            <p className="text-xs text-gray-400 mb-6">Create an account for your staff or sales agent.</p>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">First Name *</label>
                  <input
                    required type="text" value={formData.firstName}
                    onChange={e => setFormData(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Rahul"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Last Name *</label>
                  <input
                    required type="text" value={formData.lastName}
                    onChange={e => setFormData(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Sharma"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Email Address *</label>
                <input
                  required type="email" value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  placeholder="rahul@yourcompany.com"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Temporary Password *</label>
                <input
                  required type="password" value={formData.password}
                  onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-900 transition"
                >
                  <option value="BUILDER_STAFF">Builder Staff</option>
                  <option value="BUILDER_ADMIN">Builder Admin</option>
                  <option value="SALES_USER">Sales Agent</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:bg-gray-50 rounded-xl transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
