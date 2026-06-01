import './globals.css';
import DashboardLayout from '@/layouts/dashboard/layout';
import React from 'react';

export const metadata = {
  title: 'Aether Builder Dashboard | Premium Property SaaS Management',
  description: 'Manage real estate towers, projects, flats, virtual experiences, dynamic custom pages, and CRM leads.',
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
