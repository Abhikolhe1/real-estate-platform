'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'BUILDER_ADMIN' | 'BUILDER_STAFF' | 'SALES_USER';
  isActive: boolean;
  createdAt: string;
}

export default function TeamManagementPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [memberRole, setMemberRole] = useState<'BUILDER_ADMIN' | 'BUILDER_STAFF' | 'SALES_USER'>('BUILDER_STAFF');
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!token || !user?.tenantId) return;
    try {
      const res = await fetch('http://localhost:3001/users/team', {
        headers: {
          'x-tenant-id': user.tenantId,
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [token, user]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('http://localhost:3001/users/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user?.tenantId || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          password: password || undefined,
          firstName,
          lastName,
          role: memberRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add team member');
      }

      setShowAddModal(false);
      resetForm();
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    if (!token || !user?.tenantId) return;
    try {
      const res = await fetch(`http://localhost:3001/users/team/${member.id}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !member.isActive }),
      });

      if (res.ok) {
        await fetchMembers();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!token || !user?.tenantId) return;
    if (!confirm('Are you sure you want to delete this team member?')) return;

    try {
      const res = await fetch(`http://localhost:3001/users/team/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': user.tenantId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setMembers(members.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete team member:', err);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setMemberRole('BUILDER_STAFF');
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Retrieving team list...</p>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Team Management</h1>
          <p className="text-gray-500 text-sm mt-1">Add, suspend, or delete team members and assign role-based access controls.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4.5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 shadow-lg transition-all"
        >
          + Add Team Member
        </button>
      </header>

      {/* Team Table */}
      <section className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="py-4 px-6">Member Profile</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Role Assignment</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="py-4.5 px-6 font-bold text-gray-900">
                    {member.firstName} {member.lastName}
                  </td>
                  <td className="py-4.5 px-6 font-mono text-gray-600">
                    {member.email}
                  </td>
                  <td className="py-4.5 px-6">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      member.role === 'BUILDER_ADMIN' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                      member.role === 'BUILDER_STAFF' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                      'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                    }`}>
                      {member.role.replace('BUILDER_', '')}
                    </span>
                  </td>
                  <td className="py-4.5 px-6">
                    <span className={`inline-flex items-center gap-1.5 font-bold text-[10px] uppercase ${
                      member.isActive ? 'text-emerald-500' : 'text-gray-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                      {member.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-4.5 px-6 text-right space-x-2">
                    {/* Don't allow toggling or deleting oneself */}
                    {member.email !== user?.email && (
                      <>
                        <button 
                          onClick={() => handleToggleActive(member)}
                          className="px-2.5 py-1.5 rounded bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 font-bold text-[10px] transition-colors"
                        >
                          {member.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleDeleteMember(member.id)}
                          className="px-2.5 py-1.5 rounded bg-white hover:bg-red-50 text-red-600 border border-gray-200 font-bold text-[10px] transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-stone-100 mb-1 font-serif">Add Team Member</h3>
            <p className="text-[9px] text-stone-500 mb-6 uppercase tracking-wider font-bold">Provision new team credentials.</p>
            
            {error && (
              <div className="mb-4 p-3 bg-amber-950/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddMember} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Leave blank for 'password'"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Role Type</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 text-stone-100 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="BUILDER_STAFF">Builder Staff (Content & Media)</option>
                  <option value="SALES_USER">Sales User (Leads & Followups)</option>
                  <option value="BUILDER_ADMIN">Builder Admin (Full Control)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-4.5 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-bold text-xs transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
