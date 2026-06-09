'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Invalid credentials');
      }

      const data = await response.json();
      if (!['BUILDER_ADMIN', 'BUILDER_STAFF', 'SALES_USER'].includes(data.user.role)) {
        throw new Error('Access denied: Unauthorized role');
      }

      setAuth(data.accessToken, data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4 relative overflow-hidden font-sans">
      {/* Warm Ambient Radial Backlights */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-500/5 rounded-full blur-[140px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-stone-500/5 rounded-full blur-[140px]"></div>

      {/* Luxury Golden-Rimmed Card */}
      <div className="w-full max-w-md bg-stone-900/60 border border-stone-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <span className="text-2xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent tracking-widest font-serif">
            AETHER BRAND
          </span>
          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest mt-1">
            Builder Experience Workspace
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-950/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">
              Workspace Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@aethelgard.com"
              className="w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">
              Workspace Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 hover:brightness-110 text-[#131313] font-bold text-[10px] rounded-xl tracking-[0.2em] uppercase transition-all duration-300 active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating Workspace...' : 'Access Workspace'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-stone-800 pt-6">
          <p className="text-xs text-stone-500">
            Need to register a builder developer account?{' '}
            <Link href="/register" className="text-amber-400 hover:text-amber-300 font-bold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
