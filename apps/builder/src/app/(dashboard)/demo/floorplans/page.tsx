import dynamic from 'next/dynamic';

const ValidationStudio = dynamic(
  () => import('@/sections/canonical-twin/ValidationStudio'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 w-full items-center justify-center p-8 text-xs text-muted-foreground">
        Loading Canonical Validation Studio...
      </div>
    ),
  }
);

export default function DemoPage() {
  return <ValidationStudio />;
}
