import DemoGenerator from '@/sections/legacy-floorplan/DemoGenerator';
export default function DemoPage(){return process.env.NEXT_PUBLIC_ENABLE_LEGACY_CAD_DEMOS==='true'?<DemoGenerator/>:<p>Legacy demonstration is disabled.</p>;}
