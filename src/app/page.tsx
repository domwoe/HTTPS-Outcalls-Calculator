'use client';

import CostCalculator from '@/components/calculator';
import {Footer} from '@/components/footer';
import {initSatellite} from '@junobuild/core-peer';
import {useEffect} from 'react';

export default function Home() {
  useEffect(() => {
      (async () =>
      await initSatellite())();
  }, []);

  return (
    <div className="relative isolate min-h-[100dvh]">
      <main className="mx-auto max-w-screen-2xl py-16 px-8 md:px-24 tall:min-h-[calc(100dvh-128px)]">

          <div className="container mx-auto p-4">
      <CostCalculator />
    </div>
      </main>

      <Footer />

      {/* <Background /> */}
    </div>
  );
}
