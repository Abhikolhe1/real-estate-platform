'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@iconify/react';

interface Project {
  id: string;
  name: string;
}

interface SdkKey {
  id: string;
  keyName: string;
  apiKey: string;
  status: string;
  createdAt: string;
}

interface AnalyticsSummary {
  stats: {
    totalViews: number;
    totalClicks: number;
    leadsCaptured: number;
    uniqueSessions: number;
  };
  topFloors: Array<{ floor: string; count: number }>;
  topFlats: Array<{ flat: string; count: number }>;
  topHotspots: Array<{ hotspot: string; count: number }>;
  logs: Array<{
    id: string;
    eventName: string;
    eventData: any;
    createdAt: string;
  }>;
}

export default function SdkManagerPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'keys' | 'generator' | 'analytics' | 'docs'>('keys');

  // Shared Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // 1. SDK Keys States
  const [keys, setKeys] = useState<SdkKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);

  // 2. Embed Generator States
  const [embedMode, setEmbedMode] = useState<'building' | 'walkthrough'>('building');
  const [embedWidth, setEmbedWidth] = useState('100%');
  const [embedHeight, setEmbedHeight] = useState('650px');
  const [customPrimaryColor, setCustomPrimaryColor] = useState('#d4af37');
  const [hideBranding, setHideBranding] = useState(false);
  const [embedCodeTab, setEmbedCodeTab] = useState<'iframe' | 'react' | 'js'>('iframe');
  const [snippetCopied, setSnippetCopied] = useState(false);

  // 3. Analytics States
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Load Projects
  useEffect(() => {
    if (!token || !tenantId) return;

    fetch('http://localhost:3001/projects', {
      headers: {
        'x-tenant-id': tenantId,
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setSelectedProjectId(data[0].id);
        }
      })
      .catch((err) => console.error('Error loading projects:', err));
  }, [token, tenantId]);

  // Load SDK Keys
  const loadKeys = () => {
    if (!token || !tenantId) return;
    fetch('http://localhost:3001/sdk/keys', {
      headers: {
        'x-tenant-id': tenantId,
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setKeys(data || []))
      .catch((err) => console.error('Error loading keys:', err));
  };

  useEffect(() => {
    loadKeys();
  }, [token, tenantId]);

  // Load Analytics Summary
  const loadAnalytics = () => {
    if (!token || !tenantId || !selectedProjectId) return;
    setLoadingAnalytics(true);
    fetch(`http://localhost:3001/sdk/analytics/summary?projectId=${selectedProjectId}`, {
      headers: {
        'x-tenant-id': tenantId,
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setSummary(data);
        setLoadingAnalytics(false);
      })
      .catch((err) => {
        console.error('Error loading analytics:', err);
        setLoadingAnalytics(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab, selectedProjectId]);

  // Generate Key API
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId || !newKeyName) return;

    setGenerating(true);
    try {
      const res = await fetch('http://localhost:3001/sdk/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ keyName: newKeyName }),
      });

      if (res.ok) {
        const newKey = await res.json();
        setKeys((prev) => [newKey, ...prev]);
        setNewKeyName('');
      } else {
        alert('Failed to generate key.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // Revoke Key API
  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('Revoke this integration key? Any website utilizing this key will stop loading the 3D twin.')) return;
    if (!token || !tenantId) return;

    try {
      const res = await fetch(`http://localhost:3001/sdk/keys/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger clipboard copy feedback
  const handleCopyText = (text: string, labelId: string) => {
    navigator.clipboard.writeText(text);
    setCopyStates((prev) => ({ ...prev, [labelId]: true }));
    setTimeout(() => {
      setCopyStates((prev) => ({ ...prev, [labelId]: false }));
    }, 2000);
  };

  // Active key helper (picks first key to prefill embed codes)
  const activeKeyStr = keys.find((k) => k.status === 'active')?.apiKey || 'YOUR_SDK_API_KEY';

  // Code Generation Snippets
  const getEmbedIframeCode = () => {
    const embedUrl = `http://localhost:3000/embed/project/${selectedProjectId}?key=${activeKeyStr}&mode=${embedMode}`;
    return `<iframe src="${embedUrl}" width="${embedWidth}" height="${embedHeight}" style="border:none; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,0.04);" allowfullscreen></iframe>`;
  };

  const getEmbedReactCode = () => {
    const embedUrl = `http://localhost:3000/embed/project/${selectedProjectId}?key=${activeKeyStr}&mode=${embedMode}`;
    return `import React from 'react';

export function VirtualWalkthrough() {
  return (
    <iframe
      src="${embedUrl}"
      width="${embedWidth}"
      height="${embedHeight}"
      style={{ border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}
      allowFullScreen
    />
  );
}`;
  };

  const getEmbedJsCode = () => {
    const embedUrl = `http://localhost:3000/embed/project/${selectedProjectId}?key=${activeKeyStr}&mode=${embedMode}`;
    return `<div id="aether-3d-walkthrough"></div>

<script>
  (function() {
    var container = document.getElementById('aether-3d-walkthrough');
    if (container) {
      var iframe = document.createElement('iframe');
      iframe.src = "${embedUrl}";
      iframe.width = "${embedWidth}";
      iframe.height = "${embedHeight}";
      iframe.style.border = "none";
      iframe.style.borderRadius = "16px";
      iframe.style.boxShadow = "0 10px 30px rgba(0,0,0,0.04)";
      iframe.setAttribute("allowfullscreen", "true");
      container.appendChild(iframe);
    }
  })();
</script>`;
  };

  const handleCopySnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fadeIn">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">SDK Platform & Universal Embeds</h1>
          <p className="text-xs text-gray-400 mt-1">Integrate interactive 3D spatial twins on any external portal or landing page, generate secure API keys, and monitor usage.</p>
        </div>
        
        {activeTab === 'analytics' && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </header>

      {/* Tabs list */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('keys')}
          className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors ${
            activeTab === 'keys' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          🔑 SDK API Keys
        </button>
        <button
          onClick={() => setActiveTab('generator')}
          className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors ${
            activeTab === 'generator' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          🔌 Embed Generator
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors ${
            activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          📈 Usage Analytics
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors ${
            activeTab === 'docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          📖 Integration Docs
        </button>
      </div>

      {/* Tab contents */}
      <div className="space-y-6">

        {/* TAB 1: SDK KEYS */}
        {activeTab === 'keys' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Generate form (4 cols) */}
            <div className="md:col-span-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Generate Integration Key</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                SDK keys validate external iframe loaders. Create distinct keys per website domain to organize and track telemetry logs separately.
              </p>
              <form onSubmit={handleGenerateKey} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="e.g. WordPress Landing Page"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-255 rounded-xl text-xs focus:outline-none focus:border-indigo-500 bg-white"
                />
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 uppercase tracking-wider"
                >
                  {generating ? 'Generating...' : 'Create API Key'}
                </button>
              </form>
            </div>

            {/* Keys list table (8 cols) */}
            <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Active API Keys</h3>
              {keys.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Icon icon="solar:shield-keyhole-bold-duotone" className="text-4xl mx-auto mb-2 text-gray-200" />
                  <p className="text-xs">No active keys generated yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px] tracking-widest pb-3">
                        <th className="pb-3">Key Label</th>
                        <th className="pb-3">API SDK Key</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Created</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((k) => (
                        <tr key={k.id} className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors">
                          <td className="py-4 font-bold text-gray-800">{k.keyName}</td>
                          <td className="py-4 font-mono text-[10px] text-gray-500 flex items-center gap-2">
                            <span>{k.apiKey}</span>
                            <button
                              onClick={() => handleCopyText(k.apiKey, k.id)}
                              className="text-gray-400 hover:text-indigo-600 transition-colors"
                              title="Copy Key"
                            >
                              <Icon icon={copyStates[k.id] ? "solar:check-circle-bold-duotone" : "solar:copy-bold-duotone"} className={copyStates[k.id] ? "text-emerald-500" : ""} />
                            </button>
                          </td>
                          <td className="py-4">
                            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase text-[9px]">
                              {k.status}
                            </span>
                          </td>
                          <td className="py-4 text-gray-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              className="px-2.5 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: EMBED GENERATOR */}
        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Embed Configurator (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 text-xs font-semibold text-gray-500">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Embed Configurator</h3>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Link Associated Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-gray-900"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Initial View Mode</label>
                <select
                  value={embedMode}
                  onChange={(e) => setEmbedMode(e.target.value as any)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-gray-900"
                >
                  <option value="building">Exterior 3D Twin</option>
                  <option value="walkthrough">Interior Guided Walkthrough</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Iframe Width</label>
                  <input
                    type="text"
                    value={embedWidth}
                    onChange={(e) => setEmbedWidth(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Iframe Height</label>
                  <input
                    type="text"
                    value={embedHeight}
                    onChange={(e) => setEmbedHeight(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideBranding}
                    onChange={(e) => setHideBranding(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-xs">Remove platform white-label branding</span>
                </label>
              </div>
            </div>

            {/* Generated Snippet Panel (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[350px]">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Integration Snippet</h3>
                  
                  {/* Copy button */}
                  <button
                    onClick={() => {
                      const code = 
                        embedCodeTab === 'iframe' ? getEmbedIframeCode() :
                        embedCodeTab === 'react' ? getEmbedReactCode() :
                        getEmbedJsCode();
                      handleCopySnippet(code);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                  >
                    <Icon icon={snippetCopied ? "solar:check-circle-bold" : "solar:copy-bold"} />
                    <span>{snippetCopied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                {/* Sub-tabs for code selector */}
                <div className="flex gap-2 mb-4 bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-fit">
                  <button
                    onClick={() => setEmbedCodeTab('iframe')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-colors ${
                      embedCodeTab === 'iframe' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    HTML iframe
                  </button>
                  <button
                    onClick={() => setEmbedCodeTab('react')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-colors ${
                      embedCodeTab === 'react' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    React Component
                  </button>
                  <button
                    onClick={() => setEmbedCodeTab('js')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-colors ${
                      embedCodeTab === 'js' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Raw JS Loader
                  </button>
                </div>

                {/* Code display window */}
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[10px] overflow-x-auto whitespace-pre h-48 border border-slate-950">
                  {embedCodeTab === 'iframe' && getEmbedIframeCode()}
                  {embedCodeTab === 'react' && getEmbedReactCode()}
                  {embedCodeTab === 'js' && getEmbedJsCode()}
                </div>
              </div>

              <div className="text-[10px] text-gray-400 bg-gray-50 p-3.5 rounded-xl border border-gray-150 mt-4 leading-normal">
                <span className="font-extrabold text-indigo-600 block mb-1">PRO-TIP:</span>
                Make sure you have configured a valid model (Phase 6) for the chosen project. The loader resolves `.glb` files dynamically based on your mode parameter.
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: USAGE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            {loadingAnalytics ? (
              <div className="py-24 flex justify-center"><Icon icon="eos-icons:loading" className="text-3xl text-indigo-600 animate-spin" /></div>
            ) : !summary ? (
              <p className="text-xs text-gray-400 italic text-center py-10">No analytics summaries logged yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AnalyticsCard label="Embed Page Views" value={summary.stats.totalViews} icon="solar:eye-bold-duotone" color="text-indigo-600 bg-indigo-50" />
                  <AnalyticsCard label="Unique Sessions" value={summary.stats.uniqueSessions} icon="solar:users-group-rounded-bold-duotone" color="text-emerald-600 bg-emerald-50" />
                  <AnalyticsCard label="Hotspot Interactions" value={summary.stats.totalClicks} icon="solar:cursor-bold-duotone" color="text-amber-600 bg-amber-50" />
                  <AnalyticsCard label="Embed Leads Captured" value={summary.stats.leadsCaptured} icon="solar:hand-stars-bold-duotone" color="text-rose-600 bg-rose-50" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Top Units (4 cols) */}
                  <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Most Viewed Units</h4>
                      {summary.topFlats.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No flat click events logged yet.</p>
                      ) : (
                        <div className="space-y-2.5 text-xs font-semibold">
                          {summary.topFlats.map((flat, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50">
                              <span className="text-gray-800">Flat Room {flat.flat}</span>
                              <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold">{flat.count} views</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Top Hotspots Clicked</h4>
                      {summary.topHotspots.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No hotspot clicks logged.</p>
                      ) : (
                        <div className="space-y-2.5 text-xs font-semibold">
                          {summary.topHotspots.map((spot, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50">
                              <span className="text-gray-800 truncate max-w-[70%]">{spot.hotspot}</span>
                              <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold">{spot.count} clicks</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Realtime Event Log (8 cols) */}
                  <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Real-Time Integration Event Feed</h4>
                    {summary.logs.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-10">No events logged in the last 24h.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase text-[9px] tracking-widest pb-2">
                              <th className="pb-2">Event Trigger</th>
                              <th className="pb-2">Details</th>
                              <th className="pb-2">Logged Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.logs.map((log) => (
                              <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                                <td className="py-3 font-bold text-gray-800 flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    log.eventName === 'viewer_opened' ? 'bg-indigo-500' :
                                    log.eventName === 'hotspot_clicked' ? 'bg-amber-500' :
                                    log.eventName === 'lead_generated' ? 'bg-rose-500' :
                                    'bg-emerald-500'
                                  }`}></span>
                                  <span>{log.eventName}</span>
                                </td>
                                <td className="py-3 font-mono text-[10px] text-gray-400 truncate max-w-[250px]">
                                  {JSON.stringify(log.eventData || {})}
                                </td>
                                <td className="py-3 text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

          </div>
        )}

        {/* TAB 4: DOCS */}
        {activeTab === 'docs' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 text-xs text-gray-600 leading-relaxed max-w-4xl">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">SDK & Integration Documentation</h3>
            
            <div className="space-y-4">
              <h4 className="font-extrabold text-gray-800 text-sm">1. Basic Web Integration</h4>
              <p>
                To place the interactive 3D twin viewer on any standard webpage, paste the iframe generator code inside your HTML container. Make sure to specify custom widths/heights directly as attributes or styles.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h4 className="font-extrabold text-gray-800 text-sm">2. Listening to Custom Event Callbacks</h4>
              <p>
                The embedded white-label viewport dispatches messaging triggers to the parent website frame. You can register a window listener on your main website to execute custom routines (like starting an enquiry checkout modal) when consumers click 3D details:
              </p>
              <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[10px] overflow-x-auto whitespace-pre border border-slate-950">
{`window.addEventListener('message', function(event) {
  // Validate domain origin if needed
  if (event.data && event.data.type === 'AETHER_3D_EVENT') {
    var name = event.data.eventName;
    var data = event.data.eventData;

    console.log("Captured 3D Event: " + name, data);

    if (name === 'hotspot_clicked' && data.hotspotName === 'Penthouse Zone') {
      // Trigger WordPress contact forms or React popups!
      openInquiryDrawer();
    }
  }
});`}
              </pre>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h4 className="font-extrabold text-gray-800 text-sm">3. WordPress Embed Integration</h4>
              <p>
                To embed in WordPress, add a **Custom HTML** block inside your Gutenberg editor or Elementor workspace, and paste the generated iframe embed code directly. Ensure that `allowfullscreen` is included in the block to support full-screen Orbit controls.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function AnalyticsCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-gray-900 mt-2">{value.toLocaleString()}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon icon={icon} className="text-xl" />
      </div>
    </div>
  );
}
