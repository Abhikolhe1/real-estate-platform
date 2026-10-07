import {Suspense} from 'react';
import ApprovedTwinView from '@/sections/canonical-twin/ApprovedTwinView';
export default function TwinPage(){return <Suspense fallback={<p>Loading floor viewer…</p>}><ApprovedTwinView/></Suspense>;}
