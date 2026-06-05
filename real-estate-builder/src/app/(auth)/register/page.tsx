'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/auth/register-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companySlug,
          email,
          password,
          firstName,
          lastName,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Registration failed');
      }

      const data = await response.json();
      setAuth(data.accessToken, data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4 py-12 relative overflow-hidden font-sans">
      {/* Warm Ambient Radial Backlights */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-500/5 rounded-full blur-[140px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-stone-500/5 rounded-full blur-[140px]"></div>

      {/* Luxury Golden-Rimmed Card */}
      <div className="w-full max-w-lg bg-stone-900/60 border border-stone-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <span className="text-2xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent tracking-widest font-serif">
            AETHER BRAND
          </span>
          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest mt-1">
            Create Developer Tenant Account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-950/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">
                Developer Company
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setCompanySlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                }}
                placeholder="e.g. Royal Oak Homes"
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">
                Website URL Slug
              </label>
              <input
                type="text"
                required
                value={companySlug}
                onChange={(e) => setCompanySlug(e.target.value)}
                placeholder="e.g. royaloak"
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-stone-100 rounded-xl text-xs transition-colors font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">
                Admin First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">
                Admin Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">
              Workspace Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@royaloak.com"
              className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
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
              className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-stone-100 rounded-xl text-xs transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-bold text-xs rounded-xl tracking-wider uppercase transition-all duration-300 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-amber-500/10"
          >
            {loading ? 'Initializing Developer Tenant...' : 'Provision Tenant Account'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-stone-800 pt-6">
          <p className="text-xs text-stone-500">
            Already have a builder account?{' '}
            <Link href="/login" className="text-amber-400 hover:text-amber-300 font-bold transition-colors">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
