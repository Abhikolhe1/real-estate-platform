import dynamic from 'next/dynamic';
import DashboardSkeleton from '@/components/dashboard-skeleton';

const ValidationStudio = dynamic(
  () => import('@/sections/canonical-twin/ValidationStudio'),
  {
    ssr: false,
    loading: () => <DashboardSkeleton />,
  },
);

export default function ValidationStudioPage() {
  return <ValidationStudio />;
}
