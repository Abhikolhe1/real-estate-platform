import './globals.css';
import DashboardLayout from '@/layouts/dashboard/layout';
import React from 'react';

export const metadata = {
  title: 'Aether Platform Admin | Enterprise Multi-Tenant SaaS Platform',
  description: 'Enterprise governance dashboard for SaaS billing, storage metrics, and tenant builder registry.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
