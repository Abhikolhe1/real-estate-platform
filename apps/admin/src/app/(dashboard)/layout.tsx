'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/layouts/dashboard/layout';
import DashboardSkeleton from '@/components/dashboard-skeleton';
export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
 const router = useRouter();
 const token = useAuthStore(state => state.token);
 const [hydrated, setHydrated] = useState(false);
 useEffect(() => {
   const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
   setHydrated(useAuthStore.persist.hasHydrated());
   return unsubscribe;
 }, []);
 useEffect(() => { if (hydrated && !token) router.replace('/login'); }, [hydrated, token, router]);
 if (!hydrated || !token) return <DashboardSkeleton />;
 return <DashboardLayout>{children}</DashboardLayout>;
}
