import './globals.css';
import MainLayout from '@/layouts/main/layout';
import React from 'react';

export const metadata = {
  title: 'Elite Horizon Estates | Immersive Real Estate Platform',
  description: 'Experience your dream home through dynamic 3D floor virtual walkthrough tours, high-fidelity visualizers, and digital maps.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
