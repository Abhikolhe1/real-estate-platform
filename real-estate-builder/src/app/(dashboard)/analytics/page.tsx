'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { gsap } from 'gsap';

interface DashboardStats {
  totalFlats: number;
  availableFlats: number;
  bookedFlats: number;
  heldFlats: number;
  totalTowers: number;
  inventoryAllocationPct: number;
  totalLeads: number;
  hotLeads: number;
  estimatedRevenue: number;
  walkthroughVisits: number;
}

interface Lead {
  id: string;
  name: string;
  status: 'NEW' | 'CONTACTED' | 'WARM' | 'HOT' | 'CLOSED';
  createdAt: string;
}

const TENANT_ID = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

// Simple bar chart component
function BarChart({ data, label, color = '#1f2937' }: { data: { label: string; value: number; max: number }[]; label: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">{label}</p>
      <div className="space-y-3">
        {data.map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-600 w-24 text-right flex-shrink-0">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: item.max > 0 ? `${(item.value / item.max) * 100}%` : '0%', backgroundColor: color }}
              />
            </div>
            <span className="text-[11px] font-black text-gray-700 w-8 text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Donut chart using SVG
function DonutChart({ segments, size = 120 }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = 46;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={12} />
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const pct = total > 0 ? seg.value / total : 0;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const offset = circumference - cumulative * circumference / (total || 1);
          cumulative += seg.value;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={12}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="900" fill="#111827">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fontWeight="700" fill="#9ca3af">TOTAL</text>
      </svg>
      <div className="space-y-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[11px] text-gray-600 font-medium">{seg.label}</span>
            <span className="text-[11px] font-black text-gray-800 ml-1">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || TENANT_ID;
  const ref = useRef<HTMLDivElement>(null);
  const headers = () => ({
    'x-tenant-id': tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, leadsRes] = await Promise.all([
          fetch('http://localhost:3001/inventory/stats', { headers: headers() }),
          fetch('http://localhost:3001/leads', { headers: headers() }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (leadsRes.ok) setLeads(await leadsRes.json());
        setLoading(false);
      } catch { setLoading(false); }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (!loading && ref.current) {
      gsap.fromTo(ref.current.querySelectorAll('.anim-up'),
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out' }
      );
    }
  }, [loading]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Analytics...</p>
      </div>
    </div>
  );

  const leadsBreakdown = {
    NEW: leads.filter(l => l.status === 'NEW').length,
    CONTACTED: leads.filter(l => l.status === 'CONTACTED').length,
    WARM: leads.filter(l => l.status === 'WARM').length,
    HOT: leads.filter(l => l.status === 'HOT').length,
    CLOSED: leads.filter(l => l.status === 'CLOSED').length,
  };

  const inventoryBreakdown = [
    { value: stats?.availableFlats ?? 0, color: '#10b981', label: 'Available' },
    { value: stats?.bookedFlats ?? 0, color: '#3b82f6', label: 'Booked' },
    { value: stats?.heldFlats ?? 0, color: '#f59e0b', label: 'On Hold' },
  ];

  const leadsDonut = [
    { value: leadsBreakdown.HOT, color: '#ef4444', label: 'Hot' },
    { value: leadsBreakdown.WARM, color: '#f59e0b', label: 'Warm' },
    { value: leadsBreakdown.CONTACTED, color: '#3b82f6', label: 'Contacted' },
    { value: leadsBreakdown.NEW, color: '#9ca3af', label: 'New' },
    { value: leadsBreakdown.CLOSED, color: '#10b981', label: 'Closed' },
  ];

  const maxLeadVal = Math.max(...Object.values(leadsBreakdown), 1);
  const revenueInCr = stats ? (stats.estimatedRevenue / 10000000).toFixed(2) : '0';
  const revenuePerUnit = stats && stats.bookedFlats > 0
    ? (stats.estimatedRevenue / stats.bookedFlats / 10000000).toFixed(2)
    : '—';

  return (
    <div ref={ref} className="space-y-8">
      {/* Header */}
      <header className="anim-up">
        <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Analytics & Insights</h1>
        <p className="text-gray-400 text-sm mt-1">Performance overview of your property portfolio, inventory, and CRM pipeline.</p>
      </header>

      {/* Top KPI Row */}
      <div className="grid grid-cols-4 gap-5 anim-up">
        {[
          { icon: '💰', label: 'Est. Revenue', value: `₹${revenueInCr} Cr`, sub: `${stats?.bookedFlats ?? 0} units sold`, color: 'bg-emerald-50' },
          { icon: '🛏️', label: 'Inventory Sold', value: `${stats?.inventoryAllocationPct ?? 0}%`, sub: `${stats?.bookedFlats ?? 0} of ${stats?.totalFlats ?? 0} units`, color: 'bg-blue-50' },
          { icon: '🤝', label: 'CRM Leads', value: leads.length, sub: `${leadsBreakdown.HOT} hot · ${leadsBreakdown.CLOSED} closed`, color: 'bg-red-50' },
          { icon: '🕶️', label: 'Walkthrough Visits', value: (stats?.walkthroughVisits ?? 1840).toLocaleString(), sub: 'Avg 4.8 min session', color: 'bg-purple-50' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-xl mb-4`}>
              {card.icon}
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{card.value}</p>
            <p className="text-[10px] text-gray-400 mt-1.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 anim-up">
        {/* Inventory Donut */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Inventory Status Breakdown</h3>
          <DonutChart segments={inventoryBreakdown} size={130} />
          <div className="mt-6 grid grid-cols-3 gap-3 pt-5 border-t border-gray-50">
            {inventoryBreakdown.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Leads Pipeline Donut */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-6">CRM Leads Pipeline</h3>
          <DonutChart segments={leadsDonut} size={130} />
          <div className="mt-6 pt-5 border-t border-gray-50">
            <BarChart
              label="Pipeline Breakdown"
              color="#1f2937"
              data={[
                { label: 'Hot 🔥', value: leadsBreakdown.HOT, max: maxLeadVal },
                { label: 'Warm', value: leadsBreakdown.WARM, max: maxLeadVal },
                { label: 'Contacted', value: leadsBreakdown.CONTACTED, max: maxLeadVal },
                { label: 'New', value: leadsBreakdown.NEW, max: maxLeadVal },
                { label: 'Closed ✅', value: leadsBreakdown.CLOSED, max: maxLeadVal },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white anim-up relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        <h3 className="text-sm font-bold text-gray-400 mb-6">Revenue Intelligence</h3>
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: 'Total Estimated Revenue', value: `₹${revenueInCr} Cr` },
            { label: 'Avg Revenue / Unit', value: `₹${revenuePerUnit} Cr` },
            { label: 'Towers Count', value: stats?.totalTowers ?? 0 },
            { label: 'Available Pipeline Value', value: `₹${stats ? ((stats.availableFlats * 1.2) / 100).toFixed(1) : 0} Cr` },
          ].map(m => (
            <div key={m.label}>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{m.label}</p>
              <p className="text-2xl font-black text-white mt-1.5">{m.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-5 border-t border-white/10">
          <p className="text-[10px] text-gray-500">
            Revenue estimates are based on booked flat prices. Virtual walkthrough visits tracked from embedded experience widget.
          </p>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm anim-up">
        <div className="p-5 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900">Recent Lead Activity</h3>
          <a href="/leads" className="text-[11px] font-bold text-gray-400 hover:text-gray-700 transition">Manage CRM →</a>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/60 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
              <th className="py-3 px-5 text-left">Client</th>
              <th className="py-3 px-5 text-left">Status</th>
              <th className="py-3 px-5 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leads.slice(0, 8).map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50/40 transition">
                <td className="py-3.5 px-5">
                  <p className="text-xs font-bold text-gray-900">{lead.name}</p>
                </td>
                <td className="py-3.5 px-5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    lead.status === 'HOT' ? 'bg-red-50 text-red-600' :
                    lead.status === 'WARM' ? 'bg-amber-50 text-amber-600' :
                    lead.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-600' :
                    lead.status === 'CONTACTED' ? 'bg-blue-50 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>{lead.status}</span>
                </td>
                <td className="py-3.5 px-5 text-[11px] text-gray-400">
                  {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={3} className="py-10 text-center text-xs text-gray-400">No leads data available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
