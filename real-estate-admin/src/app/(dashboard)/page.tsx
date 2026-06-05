'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { useAuthStore } from '@/store/authStore';

interface Builder {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  isActive: boolean;
  themeSettings?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontHeader?: string;
    fontBody?: string;
    plan?: 'Starter' | 'Professional' | 'Enterprise';
  };
  createdAt: string;
}

function SuperAdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'overview';
  const token = useAuthStore((state) => state.token);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [stats, setStats] = useState({
    activeBuilders: 0,
    totalBuilders: 0,
    projectsCount: 0,
    usersCount: 0,
    leadsCount: 0,
    monthlyMRR: 0,
    totalVisits: 0,
    storageBytes: 0,
  });
  const [loading, setLoading] = useState(true);

  // Edit / Add Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<Builder | null>(null);

  // Form inputs
  const [nameInput, setNameInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [planInput, setPlanInput] = useState<'Starter' | 'Professional' | 'Enterprise'>('Starter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Container refs for animations
  const tabContentRef = useRef<HTMLDivElement>(null);

  const fetchPlatformData = async () => {
    if (!token) return;
    try {
      // 1. Fetch builders
      const buildersRes = await fetch('http://localhost:3001/builders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (buildersRes.ok) {
        const data = await buildersRes.json();
        setBuilders(data);
      } else if (buildersRes.status === 401) {
        clearAuth();
        router.push('/login');
        return;
      }

      // 2. Fetch aggregated stats
      const statsRes = await fetch('http://localhost:3001/builders/stats/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load superadmin statistics:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, [token]);

  // Trigger performant entry GSAP animations on tab change
  useEffect(() => {
    if (tabContentRef.current) {
      gsap.fromTo(
        tabContentRef.current.querySelectorAll('.anim-fade-in'),
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [activeTab, loading]);

  const handleAddBuilder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput || !token) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('http://localhost:3001/builders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: nameInput,
          slug: slugInput || nameInput.toLowerCase().replace(/\s+/g, '-'),
          themeSettings: {
            plan: planInput,
            logo: nameInput.toUpperCase().substring(0, 10),
            primaryColor: planInput === 'Enterprise' ? '#c084fc' : planInput === 'Professional' ? '#60a5fa' : '#34d399',
          }
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        resetForm();
        await fetchPlatformData();
      }
    } catch (err) {
      console.error('Failed to add builder account:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (builder: Builder) => {
    setSelectedBuilder(builder);
    setNameInput(builder.name);
    setSlugInput(builder.slug);
    setDomainInput(builder.customDomain || '');
    setPlanInput(builder.themeSettings?.plan || 'Starter');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilder || !token) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`http://localhost:3001/builders/${selectedBuilder.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: nameInput,
          slug: slugInput,
          customDomain: domainInput || null,
          themeSettings: {
            ...selectedBuilder.themeSettings,
            plan: planInput,
          }
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        resetForm();
        await fetchPlatformData();
      }
    } catch (err) {
      console.error('Failed to save builder portfolio details:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (builder: Builder) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:3001/builders/${builder.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !builder.isActive }),
      });
      if (res.ok) {
        await fetchPlatformData();
      }
    } catch (err) {
      console.error('Failed to toggle builder status:', err);
    }
  };

  const handleDeleteBuilder = async (builderId: string) => {
    if (!token) return;
    const doubleCheck = confirm(
      'CAUTION: Deleting this builder developer account will immediately cascade and permanently destroy all towers, inventory, leads, layouts, and users connected to this tenant. Do you want to proceed?'
    );
    if (!doubleCheck) return;

    try {
      const res = await fetch(`http://localhost:3001/builders/${builderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchPlatformData();
      }
    } catch (err) {
      console.error('Error removing builder tenant:', err);
    }
  };

  const resetForm = () => {
    setNameInput('');
    setSlugInput('');
    setDomainInput('');
    setPlanInput('Starter');
    setSelectedBuilder(null);
  };

  const formatStorage = (bytes: number) => {
    if (!bytes) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-9 h-9 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading Aether Control Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={tabContentRef} className="space-y-10">
      {/* -------------------- 1. OVERVIEW VIEW -------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          <header className="flex justify-between items-center anim-fade-in">
            <div>
              <h1 className="text-3xl font-black text-slate-100 tracking-tight">Governance Intelligence</h1>
              <p className="text-slate-500 text-xs mt-1">Global command deck monitoring real estate tenant allocation, subscriptions metrics, and storage.</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4.5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 shadow-lg shadow-indigo-600/10 transition-all duration-300 active:scale-95"
            >
              + Create Tenant Account
            </button>
          </header>

          {/* Stats Aggregations */}
          <section className="grid grid-cols-4 gap-6 anim-fade-in">
            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full"></div>
              <span className="text-2xl">🏢</span>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-4">Active Developers</p>
              <h2 className="text-3xl font-black text-slate-100 mt-1.5">{stats.activeBuilders}</h2>
              <span className="text-[10px] text-indigo-400 font-bold block mt-1.5">Across {stats.totalBuilders} total tenants</span>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full"></div>
              <span className="text-2xl">💳</span>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-4">Monthly MRR Gross</p>
              <h2 className="text-3xl font-black text-slate-100 mt-1.5">₹{stats.monthlyMRR.toLocaleString('en-IN')}</h2>
              <span className="text-[10px] text-emerald-500 font-bold block mt-1.5">SaaS Platform Subscriptions</span>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full"></div>
              <span className="text-2xl">🌐</span>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-4">Walkthrough Visits</p>
              <h2 className="text-3xl font-black text-slate-100 mt-1.5">{stats.totalVisits.toLocaleString()}</h2>
              <span className="text-[10px] text-slate-500 font-bold block mt-1.5">Interactive virtual experiences</span>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 blur-2xl rounded-full"></div>
              <span className="text-2xl">💾</span>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-4">S3 Assets Storage</p>
              <h2 className="text-3xl font-black text-slate-100 mt-1.5">{formatStorage(stats.storageBytes)}</h2>
              <span className="text-[10px] text-slate-500 font-bold block mt-1.5">GLB, PDFs & Luxury Renders</span>
            </div>
          </section>

          {/* Quick List Overview */}
          <section className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden shadow-sm anim-fade-in">
            <div className="p-6 border-b border-slate-900 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Builder Tenancies</h3>
              <span className="text-[10px] bg-slate-900 text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-800">
                Seeded DB State
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                     <th className="py-4 px-6">Company Detail</th>
                    <th className="py-4 px-6">Domain Settings</th>
                    <th className="py-4 px-6">Pricing Tier</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Quick Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs">
                  {builders.slice(0, 5).map((builder) => (
                    <tr key={builder.id} className="hover:bg-slate-900/30 transition-colors duration-200">
                      <td className="py-4.5 px-6">
                        <p className="font-bold text-slate-200 text-sm">{builder.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {builder.id}</p>
                      </td>
                      <td className="py-4.5 px-6">
                        <span className="text-indigo-400 font-semibold">
                          {builder.customDomain || `/${builder.slug}`}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-slate-300 font-medium">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          builder.themeSettings?.plan === 'Enterprise' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          builder.themeSettings?.plan === 'Professional' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {builder.themeSettings?.plan || 'Starter'}
                        </span>
                      </td>
                      <td className="py-4.5 px-6">
                        <span className={`inline-flex items-center gap-1.5 font-bold text-[10px] uppercase ${
                          builder.isActive ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${builder.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                          {builder.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        <button 
                          onClick={() => handleToggleActive(builder)}
                          className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all border ${
                            builder.isActive 
                              ? 'bg-slate-900 text-slate-400 hover:text-red-400 border-slate-800' 
                              : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-600 hover:text-white'
                          }`}
                        >
                          {builder.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* -------------------- 2. BUILDERS DIRECTORY VIEW -------------------- */}
      {activeTab === 'builders' && (
        <div className="space-y-10">
          <header className="flex justify-between items-center anim-fade-in">
            <div>
              <h1 className="text-3xl font-black text-slate-100 tracking-tight">Builders Directory</h1>
              <p className="text-slate-500 text-xs mt-1">Inspect developer credentials, configure custom domains, or remove SaaS tenancies.</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4.5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 shadow-lg shadow-indigo-600/10 transition-all duration-300"
            >
              + Create Tenant Account
            </button>
          </header>

          <section className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden shadow-sm anim-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="py-4 px-6">Builder details</th>
                    <th className="py-4 px-6">Website Slug</th>
                    <th className="py-4 px-6">Custom Domain</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Created Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs">
                  {builders.map((builder) => (
                    <tr key={builder.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-4.5 px-6">
                        <p className="font-bold text-slate-200 text-sm">{builder.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">UUID: {builder.id}</p>
                      </td>
                      <td className="py-4.5 px-6 font-semibold text-slate-300">
                        /{builder.slug}
                      </td>
                      <td className="py-4.5 px-6 text-indigo-400 font-medium font-mono">
                        {builder.customDomain || 'Not Configured'}
                      </td>
                      <td className="py-4.5 px-6">
                        <span className={`inline-flex items-center gap-1.5 font-bold text-[10px] uppercase ${
                          builder.isActive ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${builder.isActive ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                          {builder.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-slate-500">
                        {new Date(builder.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4.5 px-6 text-right space-x-2">
                        <button 
                          onClick={() => handleEditOpen(builder)}
                          className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-bold text-[10px] transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteBuilder(builder.id)}
                          className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-red-950/30 text-slate-400 hover:text-red-400 border border-slate-800 font-bold text-[10px] transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* -------------------- 3. BILLING & SUBSCRIPTIONS VIEW -------------------- */}
      {activeTab === 'billing' && (
        <div className="space-y-10">
          <header className="anim-fade-in">
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">Billing & Subscriptions</h1>
            <p className="text-slate-500 text-xs mt-1">Review active SaaS pricing plans, monitor MRC values, and track revenue generation.</p>
          </header>

          <section className="grid grid-cols-3 gap-6 anim-fade-in">
            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                Starter Tier
              </span>
              <h3 className="text-2xl font-black text-slate-100 mt-4">₹4,20,000<span className="text-xs font-semibold text-slate-500"> / month</span></h3>
              <p className="text-slate-400 text-xs mt-2">Up to 3 properties, 50GB assets limit, custom subdomains.</p>
              <div className="border-t border-slate-900 mt-6 pt-4 flex justify-between items-center text-xs text-slate-500">
                <span>Active Developers:</span>
                <span className="text-slate-300 font-bold">
                  {builders.filter(b => b.themeSettings?.plan === 'Starter' || !b.themeSettings?.plan).length} Accounts
                </span>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest">
                Professional Tier
              </span>
              <h3 className="text-2xl font-black text-slate-100 mt-4">₹8,40,000<span className="text-xs font-semibold text-slate-500"> / month</span></h3>
              <p className="text-slate-400 text-xs mt-2">Up to 10 properties, 250GB assets limit, custom domain configuration.</p>
              <div className="border-t border-slate-900 mt-6 pt-4 flex justify-between items-center text-xs text-slate-500">
                <span>Active Developers:</span>
                <span className="text-slate-300 font-bold">
                  {builders.filter(b => b.themeSettings?.plan === 'Professional').length} Accounts
                </span>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-widest">
                Enterprise Tier
              </span>
              <h3 className="text-2xl font-black text-slate-100 mt-4">Custom Pricing</h3>
              <p className="text-slate-400 text-xs mt-2">Unlimited projects, dedicated CDN, custom VR simulations, SLAs.</p>
              <div className="border-t border-slate-900 mt-6 pt-4 flex justify-between items-center text-xs text-slate-500">
                <span>Active Developers:</span>
                <span className="text-slate-300 font-bold">
                  {builders.filter(b => b.themeSettings?.plan === 'Enterprise').length} Accounts
                </span>
              </div>
            </div>
          </section>

          <section className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden shadow-sm anim-fade-in">
            <div className="p-6 border-b border-slate-900">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tenant Subscription Register</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="py-4 px-6">Developer Account</th>
                  <th className="py-4 px-6">Pricing Tier</th>
                  <th className="py-4 px-6">Monthly Value</th>
                  <th className="py-4 px-6">Cycle Renew</th>
                  <th className="py-4 px-6 text-right">Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs">
                {builders.map((builder) => {
                  const plan = builder.themeSettings?.plan || 'Starter';
                  const price = plan === 'Enterprise' ? 'Custom Quote' : plan === 'Professional' ? '₹8,40,000' : '₹4,20,000';
                  return (
                    <tr key={builder.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-4.5 px-6 font-bold text-slate-200">{builder.name}</td>
                      <td className="py-4.5 px-6 font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          plan === 'Enterprise' ? 'bg-purple-500/10 text-purple-400' :
                          plan === 'Professional' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {plan}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-slate-300 font-mono">{price}</td>
                      <td className="py-4.5 px-6 text-slate-500">Auto-Debit: 1st of Month</td>
                      <td className="py-4.5 px-6 text-right">
                        <button 
                          onClick={() => handleEditOpen(builder)}
                          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          Modify Plan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* -------------------- 4. SYSTEM SETTINGS VIEW -------------------- */}
      {activeTab === 'settings' && (
        <div className="space-y-10">
          <header className="anim-fade-in">
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">System Settings</h1>
            <p className="text-slate-500 text-xs mt-1">Configure global platform limits, S3 bucket keys, and default fallback layout structures.</p>
          </header>

          <div className="grid grid-cols-5 gap-8 anim-fade-in">
            <section className="col-span-3 bg-slate-950/40 border border-slate-900 rounded-2xl p-6 space-y-6">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-900 pb-4">Global Cloud Settings</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">AWS S3 Bucket Location</label>
                  <input 
                    type="text" 
                    disabled 
                    value="s3://aether-platform-experiences-prod" 
                    className="w-full px-4 py-3 border border-slate-800 bg-slate-950 text-slate-400 rounded-xl text-xs focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">CloudFront CDN Caching</label>
                  <input 
                    type="text" 
                    disabled 
                    value="Enabled (Edge Locations)" 
                    className="w-full px-4 py-3 border border-slate-800 bg-slate-950 text-slate-400 rounded-xl text-xs focus:outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Global Fallback Theme Primary Color</label>
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 border border-slate-800"></div>
                  <input 
                    type="text" 
                    disabled 
                    value="#6366f1 (Indigo Accent)" 
                    className="flex-1 px-4 py-3 border border-slate-800 bg-slate-950 text-slate-400 rounded-xl text-xs focus:outline-none" 
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  disabled
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs cursor-not-allowed border border-slate-700"
                >
                  Save Global Variables
                </button>
              </div>
            </section>

            <section className="col-span-2 bg-slate-950/40 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-900 pb-4">API Token Registry</h3>
                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  These authorization tokens are injected globally to control backend services (Twilio SMS/WhatsApp, Resend mailings, and GPU compression pipelines).
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-900 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">JWT Secret Key:</span>
                <span className="font-mono text-slate-500 font-bold">aether-secret-token...</span>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* -------------------- 5. ADD TENANT MODAL -------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-slate-100 mb-1">Create Builder Tenant Account</h3>
            <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-wider font-bold">Creates a brand new multi-tenant portal.</p>
            
            <form onSubmit={handleAddBuilder} className="flex flex-col gap-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Developer Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Oak Residences"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setSlugInput(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                  }}
                  className="w-full px-4 py-3 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Website URL Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. royaloak"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Initial Subscription Tier</label>
                <select
                  value={planInput}
                  onChange={(e) => setPlanInput(e.target.value as any)}
                  className="w-full px-4 py-3 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Starter">Starter Tier (₹4.2 Lakh/mo)</option>
                  <option value="Professional">Professional Tier (₹8.4 Lakh/mo)</option>
                  <option value="Enterprise">Enterprise Tier (Custom Quote)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-4.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/10 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- 6. EDIT TENANT MODAL -------------------- */}
      {showEditModal && selectedBuilder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-slate-100 mb-1">Modify Builder Profile</h3>
            <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-wider font-bold">ID: {selectedBuilder.id}</p>
            
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Developer Company Name</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Website URL Slug</label>
                <input
                  type="text"
                  required
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Custom Domain Mapping</label>
                <input
                  type="text"
                  placeholder="e.g. royaloakhomes.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subscription Plan</label>
                <select
                  value={planInput}
                  onChange={(e) => setPlanInput(e.target.value as any)}
                  className="w-full px-4 py-3 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Starter">Starter Tier (₹4.2 Lakh/mo)</option>
                  <option value="Professional">Professional Tier (₹8.4 Lakh/mo)</option>
                  <option value="Enterprise">Enterprise Tier (Custom Quote)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); resetForm(); }}
                  className="px-4.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/10 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[70vh] bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-9 h-9 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading Dashboard...</p>
        </div>
      </div>
    }>
      <SuperAdminPageContent />
    </Suspense>
  );
}
